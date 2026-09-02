import api from './api';

export const orderService = {
  getMyOrders: async () => {
    // Mocking the API response since the backend /customer/orders endpoint doesn't exist
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            order_number: 'ORD-512535',
            created_at: '2026-09-02T10:30:00Z',
            grand_total: 363.95,
            status: 'delivered',
            items: [
              {
                id: 101,
                quantity: 1,
                price: 363.95,
                product_variant: {
                  size: '250g',
                  media: [{ url: '/images/1.png' }],
                  product: { name: 'Roasted Seeds Mix' }
                }
              }
            ]
          },
          {
            id: 2,
            order_number: 'ORD-894721',
            created_at: '2026-08-28T14:15:00Z',
            grand_total: 850.00,
            status: 'pending',
            items: [
              {
                id: 102,
                quantity: 2,
                price: 425.00,
                product_variant: {
                  size: '500g',
                  media: [{ url: '/images/2.png' }],
                  product: { name: 'Kesar Pista Powder' }
                }
              }
            ]
          }
        ]);
      }, 600); // Simulate network delay
    });
  }
};
