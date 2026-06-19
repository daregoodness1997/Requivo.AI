using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Requivo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddErpConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ErpConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ProviderId = table.Column<string>(type: "text", nullable: false),
                    ProviderName = table.Column<string>(type: "text", nullable: false),
                    IsConnected = table.Column<bool>(type: "boolean", nullable: false),
                    ApiKey = table.Column<string>(type: "text", nullable: true),
                    BearerToken = table.Column<string>(type: "text", nullable: true),
                    BaseUrl = table.Column<string>(type: "text", nullable: true),
                    ExtraConfig = table.Column<string>(type: "text", nullable: true),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ErpConnections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ErpConnections_UserId_ProviderId",
                table: "ErpConnections",
                columns: new[] { "UserId", "ProviderId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ErpConnections");
        }
    }
}
