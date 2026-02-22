using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Catalyst.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnExchangeTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "starting_cash",
                table: "vans",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "debt_amount",
                table: "tasks",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "paid_amount",
                table: "tasks",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "payment_type",
                table: "tasks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "cost_price",
                table: "task_items",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "invoice_id",
                table: "supplier_payments",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "attendances",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    company_id = table.Column<int>(type: "integer", nullable: false),
                    employee_id = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    check_in = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    check_out = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    overtime_hours = table.Column<decimal>(type: "numeric", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attendances", x => x.id);
                    table.ForeignKey(
                        name: "FK_attendances_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_attendances_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quotes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    company_id = table.Column<int>(type: "integer", nullable: false),
                    quote_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    employee_id = table.Column<int>(type: "integer", nullable: true),
                    quote_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    valid_until = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric", nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    tax_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    terms = table.Column<string>(type: "text", nullable: true),
                    converted_order_id = table.Column<int>(type: "integer", nullable: true),
                    converted_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotes", x => x.id);
                    table.ForeignKey(
                        name: "FK_quotes_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quotes_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quotes_employees_employee_id",
                        column: x => x.employee_id,
                        principalTable: "employees",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "return_exchanges",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    company_id = table.Column<int>(type: "integer", nullable: false),
                    transaction_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    original_order_id = table.Column<int>(type: "integer", nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    warehouse_id = table.Column<int>(type: "integer", nullable: false),
                    cashier_id = table.Column<int>(type: "integer", nullable: true),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    return_total = table.Column<decimal>(type: "numeric", nullable: false),
                    exchange_total = table.Column<decimal>(type: "numeric", nullable: false),
                    net_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    refund_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    refund_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    payment_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    payment_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    manager_approval_required = table.Column<bool>(type: "boolean", nullable: false),
                    approved_by = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_return_exchanges", x => x.id);
                    table.ForeignKey(
                        name: "FK_return_exchanges_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_return_exchanges_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_return_exchanges_employees_approved_by",
                        column: x => x.approved_by,
                        principalTable: "employees",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_return_exchanges_employees_cashier_id",
                        column: x => x.cashier_id,
                        principalTable: "employees",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_return_exchanges_orders_original_order_id",
                        column: x => x.original_order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_return_exchanges_warehouses_warehouse_id",
                        column: x => x.warehouse_id,
                        principalTable: "warehouses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "units",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    company_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    abbreviation = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_base = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_units", x => x.id);
                    table.ForeignKey(
                        name: "FK_units_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quote_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    quote_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    unit_id = table.Column<int>(type: "integer", nullable: true),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric", nullable: false),
                    discount_percent = table.Column<decimal>(type: "numeric", nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    line_total = table.Column<decimal>(type: "numeric", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quote_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_quote_items_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quote_items_quotes_quote_id",
                        column: x => x.quote_id,
                        principalTable: "quotes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "return_exchange_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    return_exchange_id = table.Column<int>(type: "integer", nullable: false),
                    item_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    original_order_item_id = table.Column<int>(type: "integer", nullable: true),
                    unit_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric", nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    line_total = table.Column<decimal>(type: "numeric", nullable: false),
                    reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    condition = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    inventory_action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ReturnExchangeId1 = table.Column<int>(type: "integer", nullable: true),
                    ReturnExchangeId2 = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_return_exchange_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_return_exchange_items_order_items_original_order_item_id",
                        column: x => x.original_order_item_id,
                        principalTable: "order_items",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_return_exchange_items_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_return_exchange_items_return_exchanges_ReturnExchangeId1",
                        column: x => x.ReturnExchangeId1,
                        principalTable: "return_exchanges",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_return_exchange_items_return_exchanges_ReturnExchangeId2",
                        column: x => x.ReturnExchangeId2,
                        principalTable: "return_exchanges",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_return_exchange_items_return_exchanges_return_exchange_id",
                        column: x => x.return_exchange_id,
                        principalTable: "return_exchanges",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_supplier_payments_invoice_id",
                table: "supplier_payments",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_attendances_company_id",
                table: "attendances",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_attendances_employee_id",
                table: "attendances",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_quote_items_product_id",
                table: "quote_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_quote_items_quote_id",
                table: "quote_items",
                column: "quote_id");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_company_id",
                table: "quotes",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_customer_id",
                table: "quotes",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_employee_id",
                table: "quotes",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchange_items_original_order_item_id",
                table: "return_exchange_items",
                column: "original_order_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchange_items_product_id",
                table: "return_exchange_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchange_items_return_exchange_id",
                table: "return_exchange_items",
                column: "return_exchange_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchange_items_ReturnExchangeId1",
                table: "return_exchange_items",
                column: "ReturnExchangeId1");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchange_items_ReturnExchangeId2",
                table: "return_exchange_items",
                column: "ReturnExchangeId2");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchanges_approved_by",
                table: "return_exchanges",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchanges_cashier_id",
                table: "return_exchanges",
                column: "cashier_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchanges_company_id_transaction_number",
                table: "return_exchanges",
                columns: new[] { "company_id", "transaction_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_return_exchanges_customer_id",
                table: "return_exchanges",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchanges_original_order_id",
                table: "return_exchanges",
                column: "original_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_return_exchanges_warehouse_id",
                table: "return_exchanges",
                column: "warehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_units_company_id",
                table: "units",
                column: "company_id");

            migrationBuilder.AddForeignKey(
                name: "FK_supplier_payments_purchase_invoices_invoice_id",
                table: "supplier_payments",
                column: "invoice_id",
                principalTable: "purchase_invoices",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_supplier_payments_purchase_invoices_invoice_id",
                table: "supplier_payments");

            migrationBuilder.DropTable(
                name: "attendances");

            migrationBuilder.DropTable(
                name: "quote_items");

            migrationBuilder.DropTable(
                name: "return_exchange_items");

            migrationBuilder.DropTable(
                name: "units");

            migrationBuilder.DropTable(
                name: "quotes");

            migrationBuilder.DropTable(
                name: "return_exchanges");

            migrationBuilder.DropIndex(
                name: "IX_supplier_payments_invoice_id",
                table: "supplier_payments");

            migrationBuilder.DropColumn(
                name: "starting_cash",
                table: "vans");

            migrationBuilder.DropColumn(
                name: "debt_amount",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "paid_amount",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "payment_type",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "cost_price",
                table: "task_items");

            migrationBuilder.DropColumn(
                name: "invoice_id",
                table: "supplier_payments");
        }
    }
}
