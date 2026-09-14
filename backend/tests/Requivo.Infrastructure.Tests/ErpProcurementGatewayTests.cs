using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Requivo.Core.Interfaces;
using Requivo.Core.Models;
using Requivo.Infrastructure.Integrations;
using Xunit;

namespace Requivo.Infrastructure.Tests;

public class ErpProcurementGatewayTests
{
    private sealed class FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            return Task.FromResult(responder(request));
        }
    }

    private static Mock<IConfiguration> CreateConfig(params (string Key, string Value)[] entries)
    {
        var dict = entries.ToDictionary(e => e.Key, e => e.Value);
        var config = new Mock<IConfiguration>();
        config.Setup(c => c[It.IsAny<string>()])
            .Returns((string key) => dict.TryGetValue(key, out var value) ? value : null);
        return config;
    }

    private static ErpProcurementGateway CreateGateway(
        Mock<IConfiguration> config,
        FakeHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler);
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

        return new ErpProcurementGateway(
            factory.Object,
            config.Object,
            NullLogger<ErpProcurementGateway>.Instance);
    }

    private static CreatePurchaseOrderRequest SampleRequest() => new()
    {
        SupplierId = "supplier-123",
        Currency = "USD",
        CostCenter = "CC-42",
        RequestedBy = "user-1",
        IdempotencyKey = "wf-1:0:create-po",
        Lines =
        [
            new PurchaseOrderLine { Sku = "CHAIR-001", Quantity = 10, UnitPrice = 12.5m }
        ]
    };

    private static WorkflowContext SampleContext() => new()
    {
        WorkflowId = "wf-1",
        UserId = "user-1",
        UserInput = "Create purchase order",
    };

    [Fact]
    public async Task CreatePurchaseOrderAsync_NoBaseUrlConfigured_ReturnsSimulatedDemoResponse()
    {
        var handler = new FakeHttpMessageHandler(_ => throw new Xunit.Sdk.XunitException("HTTP must not be called in demo mode"));
        var gateway = CreateGateway(CreateConfig(), handler);

        var result = await gateway.CreatePurchaseOrderAsync(SampleRequest(), SampleContext(), CancellationToken.None);

        result.SourceSystem.Should().Be("Demo");
        result.Status.Should().Be("created");
        result.ExternalOrderId.Should().MatchRegex(@"^PO-\d{8}-\d{3}$");
        result.ExternalDocumentUrl.Should().BeNull();
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public async Task CreatePurchaseOrderAsync_ConfiguredBaseUrl_PostsOrderAndParsesResponse()
    {
        var handler = new FakeHttpMessageHandler(
            _ => new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = new StringContent(
                    """{"purchaseOrderId":"PO-20240914-042","status":"created","documentUrl":"https://erp.example.test/purchase-orders/42"}""",
                    Encoding.UTF8,
                    "application/json")
            });
        var config = CreateConfig(
            ("Erp:Procurement:BaseUrl", "https://erp.example.test"),
            ("Erp:Procurement:SourceSystem", "TestERP"));
        var gateway = CreateGateway(config, handler);

        var result = await gateway.CreatePurchaseOrderAsync(SampleRequest(), SampleContext(), CancellationToken.None);

        result.ExternalOrderId.Should().Be("PO-20240914-042");
        result.Status.Should().Be("created");
        result.SourceSystem.Should().Be("TestERP");
        result.ExternalDocumentUrl.Should().Be("https://erp.example.test/purchase-orders/42");

        var sent = handler.Requests.Should().ContainSingle().Subject;
        sent.RequestUri?.ToString().Should().Be("https://erp.example.test/purchase-orders");
        sent.Headers.Should().ContainKey("Idempotency-Key").WhoseValue.Should().Contain("wf-1:0:create-po");
        sent.Headers.Should().ContainKey("X-Requivo-Workflow-Id").WhoseValue.Should().Contain("wf-1");
        sent.Headers.Should().ContainKey("X-Requivo-User-Id").WhoseValue.Should().Contain("user-1");
    }

    [Fact]
    public async Task CreatePurchaseOrderAsync_NonSuccessStatus_Throws()
    {
        var handler = new FakeHttpMessageHandler(
            _ => new HttpResponseMessage(HttpStatusCode.BadGateway)
            {
                ReasonPhrase = "Bad Gateway",
                Content = new StringContent("upstream exploded")
            });
        var gateway = CreateGateway(CreateConfig(("Erp:Procurement:BaseUrl", "https://erp.example.test")), handler);

        var act = () => gateway.CreatePurchaseOrderAsync(SampleRequest(), SampleContext(), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*502*Bad Gateway*upstream exploded*");
    }

    [Fact]
    public async Task CreatePurchaseOrderAsync_ApiKeyAuthMode_AddsApiKeyHeader()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.Created));
        var config = CreateConfig(
            ("Erp:Procurement:BaseUrl", "https://erp.example.test"),
            ("Erp:Procurement:AuthMode", "ApiKey"),
            ("Erp:Procurement:ApiKey", "secret-api-key"));
        var gateway = CreateGateway(config, handler);

        await gateway.CreatePurchaseOrderAsync(SampleRequest(), SampleContext(), CancellationToken.None);

        var sent = handler.Requests.Should().ContainSingle().Subject;
        sent.Headers.Should().ContainKey("X-API-Key").WhoseValue.Should().Contain("secret-api-key");
    }

    [Fact]
    public async Task CreatePurchaseOrderAsync_BearerAuthMode_SetsAuthorizationHeader()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.Created));
        var config = CreateConfig(
            ("Erp:Procurement:BaseUrl", "https://erp.example.test"),
            ("Erp:Procurement:AuthMode", "Bearer"),
            ("Erp:Procurement:BearerToken", "tok-123"));
        var gateway = CreateGateway(config, handler);

        await gateway.CreatePurchaseOrderAsync(SampleRequest(), SampleContext(), CancellationToken.None);

        var sent = handler.Requests.Should().ContainSingle().Subject;
        sent.Headers.Authorization?.Scheme.Should().Be("Bearer");
        sent.Headers.Authorization?.Parameter.Should().Be("tok-123");
    }
}