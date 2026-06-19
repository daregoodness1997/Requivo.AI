using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Requivo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CredentialsColumnToText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Credentials",
                table: "ErpConnections",
                type: "text",
                nullable: true,
                oldClrType: typeof(JsonElement),
                oldType: "jsonb",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<JsonElement>(
                name: "Credentials",
                table: "ErpConnections",
                type: "jsonb",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
