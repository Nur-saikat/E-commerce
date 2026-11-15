import { storage } from '../storage';
import type { Order } from '../api/types';

const KEY = 'safwan.lastOrder';

export interface LastOrderHint {
  id: string;
  orderNumber: string;
  email: string;
  paymentMethod: string;
}

let memory: { hint: LastOrderHint; order?: Order } | null = null;

export const lastOrderStore = {
  remember(order: Order, email: string) {
    memory = {
      hint: { id: order.id, orderNumber: order.orderNumber, email, paymentMethod: order.paymentMethod },
      order,
    };
    storage.setJSON(KEY, memory.hint);
  },
  getMemoryOrder(orderId?: string): Order | null {
    if (!memory) return null;
    if (orderId && memory.order?.id !== orderId) return null;
    return memory.order ?? null;
  },
  async getHint(orderId?: string): Promise<LastOrderHint | null> {
    const hint = await storage.getJSON<LastOrderHint>(KEY);
    if (!hint) return null;
    if (orderId && hint.id !== orderId) return null;
    return hint;
  },
  async clear() {
    memory = null;
    await storage.remove(KEY);
  },
};
