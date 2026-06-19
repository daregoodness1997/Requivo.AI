using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Requivo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceCredentialsWithJsonb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApiKey",
                table: "ErpConnections");

            migrationBuilder.DropColumn(
                name: "BearerToken",
                table: "ErpConnections");

            migrationBuilder.DropColumn(
                name: "ExtraConfig",
                table: "ErpConnections");

            migrationBuilder.AddColumn<JsonElement>(
                name: "Credentials",
                table: "ErpConnections",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Credentials",
                table: "ErpConnections");

            migrationBuilder.AddColumn<string>(
                name: "ApiKey",
                table: "ErpConnections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BearerToken",
                table: "ErpConnections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExtraConfig",
                table: "ErpConnections",
                type: "text",
                nullable: true);
        }
    }
}
