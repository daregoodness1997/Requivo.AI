# ---- Build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and all project files
COPY Requivo.sln ./
COPY src/Requivo.Api/Requivo.Api.csproj src/Requivo.Api/
COPY src/Requivo.Core/Requivo.Core.csproj src/Requivo.Core/
COPY src/Requivo.Infrastructure/Requivo.Infrastructure.csproj src/Requivo.Infrastructure/
COPY src/Requivo.Orchestration/Requivo.Orchestration.csproj src/Requivo.Orchestration/
COPY src/Requivo.AI/Requivo.AI.csproj src/Requivo.AI/
COPY src/Requivo.Tools/Requivo.Tools.csproj src/Requivo.Tools/
COPY tests/Requivo.Core.Tests/Requivo.Core.Tests.csproj tests/Requivo.Core.Tests/
COPY tests/Requivo.Orchestration.Tests/Requivo.Orchestration.Tests.csproj tests/Requivo.Orchestration.Tests/

RUN dotnet restore Requivo.sln

COPY src/ src/
COPY tests/ tests/

RUN dotnet publish src/Requivo.Api/Requivo.Api.csproj \
    -c Release \
    -o /app \
    --no-restore

# ---- Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

COPY --from=build /app .

ENTRYPOINT ["dotnet", "Requivo.Api.dll"]
