using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Requivo.Infrastructure.Data;

#nullable disable

namespace Requivo.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(RequivoDbContext))]
    [Migration("20260614150000_AddContentTypeAndPlanData")]
    public partial class AddContentTypeAndPlanData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "ChatMessages",
                type: "text",
                nullable: false,
                defaultValue: "text");

            migrationBuilder.AddColumn<string>(
                name: "PlanData",
                table: "ChatMessages",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlanData",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "ChatMessages");
        }
    }
}
