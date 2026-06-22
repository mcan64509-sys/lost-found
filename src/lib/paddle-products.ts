export const PADDLE_PRODUCTS = {
  standart_ilan: {
    priceId: "pri_01kvrjkk6ezqeqnptqqvnyyvhf",
    label: "Standart İlan",
    price_cents: 999,
    priority_level: 1,
    is_urgent: false,
    days: 30,
  },
  altin_ilan: {
    priceId: "pri_01kvrjpaap51g5dxgazbptkk2t",
    label: "Altın İlan",
    price_cents: 2999,
    priority_level: 2,
    is_urgent: true,
    days: 30,
  },
  acil_ilan: {
    priceId: "pri_01kvrjqs4m8vcxc6nq3xa1ypv6",
    label: "Acil İlan",
    price_cents: 4999,
    priority_level: 3,
    is_urgent: true,
    days: 30,
  },
} as const;

export type PaddleProductType = keyof typeof PADDLE_PRODUCTS;
