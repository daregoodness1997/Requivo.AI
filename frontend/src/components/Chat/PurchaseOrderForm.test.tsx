import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrderForm from './PurchaseOrderForm';

const user = userEvent.setup();

// DOM input order: [cost center, line1(sku, qty, unitPrice, desc), line2(sku, qty, unitPrice, desc) ...]
const SKU = (line: number) => 1 + line * 4;
const QTY = (line: number) => 2 + line * 4;
const PRICE = (line: number) => 3 + line * 4;
const DESC = (line: number) => 4 + line * 4;

describe('PurchaseOrderForm', () => {
  it('submits a structured purchase-order prompt when valid line items are provided', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<PurchaseOrderForm onSubmit={onSubmit} isSending={false} />);

    const supplier = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(supplier, 'SUPPLIER-001');

    const inputs = container.querySelectorAll('input');
    await user.type(inputs[SKU(0)], 'CHAIR-001');
    await user.type(inputs[QTY(0)], '10');
    await user.type(inputs[PRICE(0)], '12.50');
    await user.type(inputs[DESC(0)], 'Ergonomic chair');

    await user.click(screen.getByRole('button', { name: /submit purchase order/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      "Create purchase order: supplier=SUPPLIER-001 currency=USD items: [sku=CHAIR-001 qty=10 price=12.5 desc='Ergonomic chair']",
    );
  });

  it('submits with cost center and currency when provided', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<PurchaseOrderForm onSubmit={onSubmit} isSending={false} />);

    const selects = container.querySelectorAll('select');
    await user.selectOptions(selects[0], 'SUPPLIER-002');
    await user.selectOptions(selects[1], 'EUR');

    const inputs = container.querySelectorAll('input');
    await user.type(inputs[0], 'OPS');
    await user.type(inputs[SKU(0)], 'MON-003');
    await user.type(inputs[QTY(0)], '2');
    await user.type(inputs[PRICE(0)], '99.99');

    await user.click(screen.getByRole('button', { name: /submit purchase order/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      'Create purchase order: supplier=SUPPLIER-002 currency=EUR costCenter=OPS items: [sku=MON-003 qty=2 price=99.99]',
    );
  });

  it('keeps the submit button disabled until a supplier and a valid line are present', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<PurchaseOrderForm onSubmit={onSubmit} isSending={false} />);

    const button = screen.getByRole('button', { name: /submit purchase order/i });
    expect(button).toBeDisabled();

    const supplier = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(supplier, 'SUPPLIER-001');

    const inputs = container.querySelectorAll('input');
    await user.type(inputs[1], '5');

    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('filters out line items without a SKU or quantity', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<PurchaseOrderForm onSubmit={onSubmit} isSending={false} />);

    await user.click(screen.getByRole('button', { name: /add line/i }));

    const supplier = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(supplier, 'SUPPLIER-003');

    const inputs = container.querySelectorAll('input');
    await user.type(inputs[SKU(0)], 'CHAIR-001');
    await user.type(inputs[QTY(0)], '10');
    await user.type(inputs[PRICE(0)], '12.50');

    await user.click(screen.getByRole('button', { name: /submit purchase order/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      'Create purchase order: supplier=SUPPLIER-003 currency=USD items: [sku=CHAIR-001 qty=10 price=12.5]',
    );
  });

  it('adds and removes line items', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<PurchaseOrderForm onSubmit={onSubmit} isSending={false} />);

    await user.click(screen.getByRole('button', { name: /add line/i }));
    expect(container.querySelectorAll('input')).toHaveLength(9);

    const supplier = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(supplier, 'SUPPLIER-004');

    const inputs = container.querySelectorAll('input');
    await user.type(inputs[SKU(0)], 'CHAIR-001');
    await user.type(inputs[QTY(0)], '10');
    await user.type(inputs[PRICE(0)], '12.50');
    await user.type(inputs[SKU(1)], 'DESK-002');
    await user.type(inputs[QTY(1)], '1');
    await user.type(inputs[PRICE(1)], '250');

    await user.click(screen.getByRole('button', { name: /submit purchase order/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      'Create purchase order: supplier=SUPPLIER-004 currency=USD items: [sku=CHAIR-001 qty=10 price=12.5 | sku=DESK-002 qty=1 price=250]',
    );
  });

  it('disables every field while sending', async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(<PurchaseOrderForm onSubmit={onSubmit} isSending={true} />);

    const inputs = container.querySelectorAll('input');
    inputs.forEach((input) => expect(input).toBeDisabled());

    const selects = container.querySelectorAll('select');
    selects.forEach((select) => expect(select).toBeDisabled());

    expect(screen.getByRole('button', { name: /submit purchase order/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add line/i })).toBeDisabled();
  });
});