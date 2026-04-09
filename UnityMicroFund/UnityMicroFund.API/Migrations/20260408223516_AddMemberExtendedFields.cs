using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UnityMicroFund.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberExtendedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EmergencyContact",
                table: "members",
                newName: "SwiftCode");

            migrationBuilder.AddColumn<bool>(
                name: "AcceptTerms",
                table: "members",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AccountHolderName",
                table: "members",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "members",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "members",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlternatePhone",
                table: "members",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "members",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfBirth",
                table: "members",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "DocumentUrl",
                table: "members",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "members",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "members",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactRelation",
                table: "members",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerName",
                table: "members",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "members",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MemberId",
                table: "members",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "members",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NomineeName",
                table: "members",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NomineePhone",
                table: "members",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NomineeRelation",
                table: "members",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Occupation",
                table: "members",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProfileImageUrl",
                table: "members",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RoutingNumber",
                table: "members",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SignatureUrl",
                table: "members",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptTerms",
                table: "members");

            migrationBuilder.DropColumn(
                name: "AccountHolderName",
                table: "members");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "members");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "members");

            migrationBuilder.DropColumn(
                name: "AlternatePhone",
                table: "members");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "members");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "members");

            migrationBuilder.DropColumn(
                name: "DocumentUrl",
                table: "members");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "members");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "members");

            migrationBuilder.DropColumn(
                name: "EmergencyContactRelation",
                table: "members");

            migrationBuilder.DropColumn(
                name: "EmployerName",
                table: "members");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "members");

            migrationBuilder.DropColumn(
                name: "MemberId",
                table: "members");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "members");

            migrationBuilder.DropColumn(
                name: "NomineeName",
                table: "members");

            migrationBuilder.DropColumn(
                name: "NomineePhone",
                table: "members");

            migrationBuilder.DropColumn(
                name: "NomineeRelation",
                table: "members");

            migrationBuilder.DropColumn(
                name: "Occupation",
                table: "members");

            migrationBuilder.DropColumn(
                name: "ProfileImageUrl",
                table: "members");

            migrationBuilder.DropColumn(
                name: "RoutingNumber",
                table: "members");

            migrationBuilder.DropColumn(
                name: "SignatureUrl",
                table: "members");

            migrationBuilder.RenameColumn(
                name: "SwiftCode",
                table: "members",
                newName: "EmergencyContact");
        }
    }
}
