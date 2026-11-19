import {
  inventoryStatusClass,
  orderStatusClass,
  paymentMethodLabel,
  paymentStatusClass,
  slugify
} from './status';

describe('status helpers', () => {
  it('maps order statuses to badges', () => {
    expect(orderStatusClass('Pending')).toBe('badge-warning');
    expect(orderStatusClass('Completed')).toBe('badge-success');
    expect(orderStatusClass('Cancelled')).toBe('badge-danger');
    expect(orderStatusClass('Refunded')).toBe('badge-danger');
    expect(orderStatusClass('Unknown')).toBe('badge-muted');
  });

  it('maps payment statuses to badges', () => {
    expect(paymentStatusClass('Paid')).toBe('badge-success');
    expect(paymentStatusClass('Pending')).toBe('badge-warning');
    expect(paymentStatusClass('Failed')).toBe('badge-danger');
    expect(paymentStatusClass('Whatever')).toBe('badge-muted');
  });

  it('maps inventory statuses to badges', () => {
    expect(inventoryStatusClass('In Stock')).toBe('badge-success');
    expect(inventoryStatusClass('Low Stock')).toBe('badge-warning');
    expect(inventoryStatusClass('Out of Stock')).toBe('badge-danger');
    expect(inventoryStatusClass('')).toBe('badge-muted');
  });

  it('provides human labels for payment methods', () => {
    expect(paymentMethodLabel('COD')).toBe('Cash on Delivery');
    expect(paymentMethodLabel('Stripe')).toBe('Card via Stripe');
    expect(paymentMethodLabel('SSLCommerz')).toBe('SSLCommerz');
    expect(paymentMethodLabel('BankTransfer')).toBe('BankTransfer');
  });

  it('slugifies product names', () => {
    expect(slugify('  Ceramic Pour-Over  ')).toBe('ceramic-pour-over');
    expect(slugify('Linen & Cotton Shirt')).toBe('linen-cotton-shirt');
    expect(slugify('Édition Noire')).toBe('dition-noire');
  });
});
