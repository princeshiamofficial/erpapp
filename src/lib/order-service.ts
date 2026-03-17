

"use server";

import { query } from './mysql';
import type { TrackingLink, Comment, OrderLogEntry, OrderItem, AdvancePaymentRecord, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatusById } from './status-service';
import { READY_FOR_DESIGN_STATUS_ID, DELIVERED_STATUS_ID } from './status-constants';
import { format, parseISO } from 'date-fns';
import { sendTelegramMessage } from './notification-utils';

const ORDERS_TABLE = 'orders';
const PROJECTS_TABLE = 'projects';
const SHIPPED_ORDERS_TABLE = 'shipped_orders';

const mapRowToOrder = (row: any): TrackingLink => ({
  id: row.id,
  companyName: row.company_name,
  address: row.address,
  phoneNumber: row.phone_number,
  orderItems: typeof row.order_items === 'string' ? JSON.parse(row.order_items) : row.order_items,
  specialClientDiscount: row.special_client_discount,
  shippingCharge: row.shipping_charge,
  orderNotes: row.order_notes,
  crmUserId: row.crm_user_id,
  crmUserName: row.crm_user_name,
  designerRepresentativeId: row.designer_representative_id,
  designerRepresentativeName: row.designer_representative_name,
  assigneeAvatarUrl: row.assignee_avatar_url,
  designerRepresentativeAvatarUrl: row.designer_representative_avatar_url,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  updatedByUserId: row.updated_by_user_id,
  updatedByUserName: row.updated_by_user_name,
  isPublic: Boolean(row.is_public),
  currentStatus: row.current_status,
  statusHistory: typeof row.status_history === 'string' ? JSON.parse(row.status_history) : row.status_history,
  comments: typeof row.comments === 'string' ? JSON.parse(row.comments) : row.comments,
  viewCount: row.view_count,
  advancePayments: typeof row.advance_payments === 'string' ? JSON.parse(row.advance_payments) : row.advance_payments,
  packzyConsignmentId: row.packzy_consignment_id,
  packzyTrackingCode: row.packzy_tracking_code,
});

export const getOrders = async (): Promise<TrackingLink[]> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${ORDERS_TABLE} ORDER BY created_at DESC`);
    return results.map(mapRowToOrder);
  } catch (error) {
    console.error("Error fetching orders from MySQL:", error);
    return [];
  }
};

export const getOrdersPaginated = async (limit: number, offset: number, searchTerm: string = ''): Promise<{ orders: TrackingLink[], total: number }> => {
  try {
    let whereClause = '';
    const params: any[] = [];
    if (searchTerm) {
      whereClause = `WHERE id LIKE ? OR company_name LIKE ? OR phone_number LIKE ? OR crm_user_name LIKE ?`;
      const searchParam = `%${searchTerm}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    const countResults = await query<any[]>(`SELECT COUNT(*) as total FROM ${ORDERS_TABLE} ${whereClause}`, params);
    const total = countResults[0].total;

    const queryStr = `SELECT * FROM ${ORDERS_TABLE} ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const results = await query<any[]>(queryStr, [...params, limit, offset]);

    return {
      orders: results.map(mapRowToOrder),
      total
    };
  } catch (error) {
    console.error("Error fetching paginated orders from MySQL:", error);
    return { orders: [], total: 0 };
  }
};



export const getOrderById = async (id: string): Promise<TrackingLink | undefined> => {
  if (!id) return undefined;
  try {
    const results = await query<any[]>(`SELECT * FROM ${ORDERS_TABLE} WHERE id = ?`, [id]);
    if (results.length > 0) {
      return mapRowToOrder(results[0]);
    }
    return undefined;
  } catch (error) {
    console.error("Error fetching order by ID from MySQL:", error);
    return undefined;
  }
};

export const getOrderByTrackingCode = async (trackingCode: string): Promise<TrackingLink | null> => {
  if (!trackingCode) return null;
  try {
    const results = await query<any[]>(`SELECT * FROM ${ORDERS_TABLE} WHERE packzy_tracking_code = ?`, [trackingCode]);
    if (results.length > 0) {
      return mapRowToOrder(results[0]);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching order by tracking code "${trackingCode}" from MySQL:`, error);
    return null;
  }
};

export const getOrdersByStatusAndTracking = async (statusId: string, onlyWithDue: boolean = false): Promise<TrackingLink[]> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${ORDERS_TABLE} WHERE current_status = ?`, [statusId]);
    const orders = results.map(mapRowToOrder);

    if (onlyWithDue) {
      return orders.filter(order => {
        const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (Number(item.lineItemTotalPrice) || 0), 0);
        const effectiveDiscount = Number(order.specialClientDiscount) || 0;
        const netPayable = orderSubtotal - effectiveDiscount;
        const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
        const shippingCharge = Number(order.shippingCharge) || 0;
        const dueAmount = netPayable + shippingCharge - totalAdvancePaid;
        return dueAmount > 0.01;
      });
    } else {
      return orders.filter(order => !!order.packzyTrackingCode);
    }
  } catch (error) {
    console.error(`Error fetching orders with status ${statusId} from MySQL:`, error);
    return [];
  }
};


export const addOrder = async (orderData: {
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePaymentAmount?: number | null;
  advancePaymentMethod?: string | null;
  advancePaymentDocumentUrl?: string | null;
  newAdvancePaymentNotes?: string | null;
  specialClientDiscount?: number | null;
  shippingCharge?: number | null;
  orderNotes?: string | null;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string;
  createdAt: string;
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString();

  try {
    let finalCreatedAt = orderData.createdAt;
    try {
      finalCreatedAt = parseISO(orderData.createdAt).toISOString();
    } catch (e) {
      finalCreatedAt = new Date().toISOString();
    }

    const currentDate = parseISO(finalCreatedAt);
    const datePrefix = `ORD-${format(currentDate, 'yyyyMMdd')}`;

    const sameDayResults = await query<any[]>(`SELECT id FROM ${ORDERS_TABLE} WHERE id LIKE ?`, [`${datePrefix}%`]);
    let newSequence = 1;
    if (sameDayResults.length > 0) {
      const lastSequence = Math.max(...sameDayResults.map(row => {
        const numPart = parseInt(row.id.split('-').pop() || '0', 10);
        return isNaN(numPart) ? 0 : numPart;
      }));
      newSequence = lastSequence + 1;
    }

    const orderId = `${datePrefix}-${String(newSequence).padStart(3, '0')}`;

    const initialLogEntry: OrderLogEntry = {
      id: uuidv4(), timestamp: finalCreatedAt, status: orderData.initialStatusId,
      changedByUserId: orderData.crmUserId, changedByUserName: orderData.crmUserName, notes: "Order created.",
    };

    const initialAdvancePayments: AdvancePaymentRecord[] = [];
    if (orderData.advancePaymentAmount && orderData.advancePaymentAmount > 0) {
      const newPayment: AdvancePaymentRecord = {
        id: uuidv4(), amount: orderData.advancePaymentAmount, date: finalCreatedAt,
        paymentMethod: orderData.advancePaymentMethod || "Unknown",
        notes: orderData.newAdvancePaymentNotes || "Initial advance payment.",
        documentUrl: orderData.advancePaymentDocumentUrl || null,
        recordedByUserId: orderData.crmUserId, recordedByUserName: orderData.crmUserName,
        status: 'Pending',
      };
      initialAdvancePayments.push(newPayment);

      const message = `
<b>🎉 New Advance Payment Received!</b>

<b>Order ID:</b> <code>${orderId}</code>
<b>Company:</b> ${orderData.companyName}
<b>Amount:</b> ${orderData.advancePaymentAmount.toLocaleString('en-IN', { style: 'currency', currency: 'BDT' })}
<b>Method:</b> ${newPayment.paymentMethod}
<b>Recorded By:</b> ${orderData.crmUserName}
      `;

      const paymentReplyMarkup = {
        inline_keyboard: [
          [
            {
              text: "📄 View Order",
              url: `https://app.colorhutbd.xyz/track/${orderId}`
            },
            {
              text: "💰 Payment History",
              url: `https://app.colorhutbd.xyz/admin/payment-history`
            }
          ]
        ]
      };

      await sendTelegramMessage(message, paymentReplyMarkup);
    }

    const mysqlCreatedAt = format(parseISO(finalCreatedAt), 'yyyy-MM-dd HH:mm:ss');
    const mysqlUpdatedAt = format(parseISO(transactionTime), 'yyyy-MM-dd HH:mm:ss');

    await query(
      `INSERT INTO ${ORDERS_TABLE} (
        id, company_name, address, phone_number, order_items, special_client_discount, shipping_charge, 
        order_notes, crm_user_id, crm_user_name, created_at, updated_at, updated_by_user_id, 
        updated_by_user_name, is_public, current_status, status_history, comments, view_count, advance_payments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, orderData.companyName, orderData.address, orderData.phoneNumber, JSON.stringify(orderData.orderItems),
        orderData.specialClientDiscount ?? null, orderData.shippingCharge ?? null, orderData.orderNotes || null,
        orderData.crmUserId, orderData.crmUserName, mysqlCreatedAt, mysqlUpdatedAt, orderData.crmUserId,
        orderData.crmUserName, false, orderData.initialStatusId, JSON.stringify([initialLogEntry]),
        JSON.stringify([]), 0, JSON.stringify(initialAdvancePayments)
      ]
    );

    return {
      id: orderId,
      companyName: orderData.companyName, address: orderData.address, phoneNumber: orderData.phoneNumber,
      orderItems: orderData.orderItems, specialClientDiscount: orderData.specialClientDiscount ?? null,
      shippingCharge: orderData.shippingCharge ?? null, orderNotes: orderData.orderNotes || null,
      crmUserId: orderData.crmUserId, crmUserName: orderData.crmUserName,
      designerRepresentativeId: null, designerRepresentativeName: null,
      assigneeAvatarUrl: null, designerRepresentativeAvatarUrl: null,
      createdAt: finalCreatedAt, updatedAt: transactionTime,
      updatedByUserId: orderData.crmUserId, updatedByUserName: orderData.crmUserName,
      isPublic: false, currentStatus: orderData.initialStatusId,
      statusHistory: [initialLogEntry], comments: [], viewCount: 0,
      advancePayments: initialAdvancePayments,
      packzyConsignmentId: null, packzyTrackingCode: null,
    };

  } catch (error: any) {
    console.error("Error adding order to MySQL:", error);
    if (error instanceof Error) throw error;
    throw new Error("An unknown error occurred while creating the order.");
  }
};


export const updateOrder = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      throw new Error(`Order ${id} not found.`);
    }

    const mysqlUpdateAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.companyName !== undefined) { fields.push('company_name = ?'); params.push(updates.companyName); }
    if (updates.address !== undefined) { fields.push('address = ?'); params.push(updates.address); }
    if (updates.phoneNumber !== undefined) { fields.push('phone_number = ?'); params.push(updates.phoneNumber); }
    if (updates.orderItems !== undefined) { fields.push('order_items = ?'); params.push(JSON.stringify(updates.orderItems)); }
    if (updates.specialClientDiscount !== undefined) { fields.push('special_client_discount = ?'); params.push(updates.specialClientDiscount); }
    if (updates.shippingCharge !== undefined) { fields.push('shipping_charge = ?'); params.push(updates.shippingCharge); }
    if (updates.orderNotes !== undefined) { fields.push('order_notes = ?'); params.push(updates.orderNotes); }
    if (updates.crmUserId !== undefined) { fields.push('crm_user_id = ?'); params.push(updates.crmUserId); }
    if (updates.crmUserName !== undefined) { fields.push('crm_user_name = ?'); params.push(updates.crmUserName); }
    if (updates.designerRepresentativeId !== undefined) { fields.push('designer_representative_id = ?'); params.push(updates.designerRepresentativeId); }
    if (updates.designerRepresentativeName !== undefined) { fields.push('designer_representative_name = ?'); params.push(updates.designerRepresentativeName); }
    if (updates.assigneeAvatarUrl !== undefined) { fields.push('assignee_avatar_url = ?'); params.push(updates.assigneeAvatarUrl); }
    if (updates.designerRepresentativeAvatarUrl !== undefined) { fields.push('designer_representative_avatar_url = ?'); params.push(updates.designerRepresentativeAvatarUrl); }
    if (updates.updatedByUserId !== undefined) { fields.push('updated_by_user_id = ?'); params.push(updates.updatedByUserId); }
    if (updates.updatedByUserName !== undefined) { fields.push('updated_by_user_name = ?'); params.push(updates.updatedByUserName); }
    if (updates.isPublic !== undefined) { fields.push('is_public = ?'); params.push(updates.isPublic); }
    if (updates.currentStatus !== undefined) { fields.push('current_status = ?'); params.push(updates.currentStatus); }
    if (updates.statusHistory !== undefined) { fields.push('status_history = ?'); params.push(JSON.stringify(updates.statusHistory)); }
    if (updates.comments !== undefined) { fields.push('comments = ?'); params.push(JSON.stringify(updates.comments)); }
    if (updates.viewCount !== undefined) { fields.push('view_count = ?'); params.push(updates.viewCount); }
    if (updates.advancePayments !== undefined) { fields.push('advance_payments = ?'); params.push(JSON.stringify(updates.advancePayments)); }
    if (updates.packzyConsignmentId !== undefined) { fields.push('packzy_consignment_id = ?'); params.push(updates.packzyConsignmentId); }
    if (updates.packzyTrackingCode !== undefined) { fields.push('packzy_tracking_code = ?'); params.push(updates.packzyTrackingCode); }

    if (fields.length === 0) return true;

    fields.push('updated_at = ?');
    params.push(mysqlUpdateAt);

    params.push(id);

    await query(`UPDATE ${ORDERS_TABLE} SET ${fields.join(', ')} WHERE id = ?`, params);
    return true;
  } catch (error) {
    console.error(`Error updating order ${id} in MySQL:`, error);
    return false;
  }
};

export async function updateAdvancePaymentStatus(
  orderId: string,
  paymentId: string,
  newStatus: 'Approved' | 'Pending'
): Promise<{ success: boolean; error?: string, order?: TrackingLink }> {
  try {
    const order = await getOrderById(orderId);
    if (!order || !order.advancePayments) {
      return { success: false, error: `Order or payment history not found for order ${orderId}.` };
    }

    let paymentUpdated = false;
    const updatedPayments = (order.advancePayments || []).map(p => {
      if (p.id === paymentId) {
        if (p.status !== newStatus) {
          paymentUpdated = true;
          return { ...p, status: newStatus };
        }
      }
      return p;
    });

    if (!paymentUpdated) {
      return { success: true, order: order }; // No change needed
    }

    const success = await updateOrder(orderId, { advancePayments: updatedPayments });
    if (success) {
      const updatedOrder = { ...order, advancePayments: updatedPayments };

      // If the new status is 'Approved', send a Telegram notification
      if (newStatus === 'Approved') {
        const payment = updatedPayments.find(p => p.id === paymentId);
        if (payment) {
          const message = `
<b>✅ Payment Approved!</b>

<b>Order ID:</b> <code>${orderId}</code>
<b>Company:</b> ${order.companyName}
<b>Amount:</b> ${payment.amount.toLocaleString('en-IN', { style: 'currency', currency: 'BDT' })}
<b>Method:</b> ${payment.paymentMethod}
<b>Recorded By:</b> ${payment.recordedByUserName}
          `;

          const paymentReplyMarkup = {
            inline_keyboard: [
              [
                {
                  text: "📄 View Order",
                  url: `https://app.colorhutbd.xyz/track/${orderId}`
                }
              ]
            ]
          };

          await sendTelegramMessage(message, paymentReplyMarkup);
        }
      }

      return { success: true, order: updatedOrder };
    } else {
      return { success: false, error: "Failed to save the updated order to the database." };
    }
  } catch (error) {
    console.error(`Error updating payment status for order ${orderId} in MySQL:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status." };
  }
}

export const updateOrdersBatch = async (updates: { id: string, data: Partial<TrackingLink> }[]): Promise<boolean> => {
  if (updates.length === 0) return true;
  try {
    for (const update of updates) {
      await updateOrder(update.id, update.data);
    }
    return true;
  } catch (error) {
    console.error("Error performing batch update on orders in MySQL:", error);
    return false;
  }
};


export const deleteOrder = async (orderId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${ORDERS_TABLE} WHERE id = ?`, [orderId]);
    await query(`DELETE FROM ${PROJECTS_TABLE} WHERE id = ?`, [orderId]);
    await query(`DELETE FROM ${SHIPPED_ORDERS_TABLE} WHERE order_id = ?`, [orderId]);
    return true;
  } catch (error) {
    console.error(`Error deleting order ${orderId} from MySQL:`, error);
    return false;
  }
};

export async function autoSettleOrderIfDelivered(
  orderId: string,
  settlementReason: string,
  actingUser: { id: string; name: string }
): Promise<boolean> {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      console.warn(`[autoSettleOrderIfDelivered] Order ${orderId} not found. Cannot settle.`);
      return false;
    }

    const isAlreadyDelivered = order.currentStatus === DELIVERED_STATUS_ID;

    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (Number(item.lineItemTotalPrice) || 0), 0);
    const effectiveDiscount = Number(order.specialClientDiscount) || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
    const shippingCharge = Number(order.shippingCharge) || 0;
    const dueAmount = netPayable + shippingCharge - totalAdvancePaid;

    const updates: Partial<TrackingLink> = {};
    let needsUpdate = false;

    if (dueAmount > 0.01) {
      const settlementRecord: AdvancePaymentRecord = {
        id: uuidv4(), amount: dueAmount, date: new Date().toISOString(), paymentMethod: "COD",
        notes: settlementReason, recordedByUserId: actingUser.id, recordedByUserName: actingUser.name,
        status: 'Approved', // Auto-approve COD payments
      };
      updates.advancePayments = [...(order.advancePayments || []), settlementRecord];
      needsUpdate = true;
    }

    if (!isAlreadyDelivered) {
      updates.currentStatus = DELIVERED_STATUS_ID;
      const newStatusLogEntry: OrderLogEntry = {
        id: uuidv4(), timestamp: new Date().toISOString(), status: DELIVERED_STATUS_ID,
        changedByUserId: actingUser.id, changedByUserName: actingUser.name, notes: settlementReason,
      };
      updates.statusHistory = [...order.statusHistory, newStatusLogEntry];
      needsUpdate = true;
    }

    if (needsUpdate) {
      updates.updatedAt = new Date().toISOString();
      updates.updatedByUserId = actingUser.id;
      updates.updatedByUserName = actingUser.name;
      await updateOrder(orderId, updates);
    }

    // Sync project status if it exists in projects table
    try {
      const projectResults = await query<any[]>(`SELECT * FROM ${PROJECTS_TABLE} WHERE id = ?`, [orderId]);
      if (projectResults.length > 0) {
        const projectData = JSON.parse(projectResults[0].data_json);
        if (projectData.status !== 'Delivered') {
          projectData.status = 'Delivered';
          projectData.deliveredAt = new Date().toISOString();
          projectData.updatedAt = new Date().toISOString();
          await query(`UPDATE ${PROJECTS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(projectData), orderId]);
          console.log(`[autoSettleOrderIfDelivered] Synced project ${orderId} to 'Delivered' in MySQL.`);
        }
      }
    } catch (projectError) {
      console.warn(`[autoSettleOrderIfDelivered] Could not sync project status for ${orderId}:`, projectError);
    }
    return true;
  } catch (error) {
    console.error(`Error auto-settling order ${orderId} in MySQL:`, error);
    return false;
  }
}

export const unsettleOrderPayment = async (
  orderId: string,
  unsettleReason: string,
  actingUser: { id: string; name: string }
): Promise<boolean> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      console.warn(`[unsettleOrderPayment] Order ${orderId} not found. Cannot unsettle.`);
      return false;
    }

    const autoSettlePaymentIndex = (order.advancePayments || []).findIndex(
      p => p.notes?.startsWith("System auto-settled:") || p.paymentMethod === "COD" || p.notes?.startsWith("Order delivered.")
    );

    if (autoSettlePaymentIndex === -1) {
      console.log(`[unsettleOrderPayment] No auto-settled payment found for order ${orderId}. No action needed.`);
      return true;
    }

    const updatedPayments = [...(order.advancePayments || [])];
    updatedPayments.splice(autoSettlePaymentIndex, 1);

    const updates: Partial<TrackingLink> = {
      advancePayments: updatedPayments,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actingUser.id,
      updatedByUserName: actingUser.name,
    };

    const newStatusLogEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: order.currentStatus, // Keep current status but add note
      changedByUserId: actingUser.id,
      changedByUserName: actingUser.name,
      notes: unsettleReason,
    };
    updates.statusHistory = [...order.statusHistory, newStatusLogEntry];

    await updateOrder(orderId, updates);
    console.log(`[unsettleOrderPayment] Successfully removed auto-settled payment for order ${orderId} in MySQL.`);
    return true;

  } catch (error) {
    console.error(`Error unsettling payment for order ${orderId} in MySQL:`, error);
    return false;
  }
};

export const addCommentToOrder = async (orderId: string, commentData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error("Order not found");

    const newComment: Comment = {
      id: uuidv4(),
      userName: commentData.userName,
      userRole: commentData.userRole,
      text: commentData.text,
      isInternal: commentData.isInternal,
      timestamp: new Date().toISOString(),
      replies: [],
      likes: { count: 0, reactedBy: [] },
      ...(commentData.userId && { userId: commentData.userId }),
    };

    const updatedComments = [...(order.comments || []), newComment];
    await updateOrder(orderId, { comments: updatedComments });
    return { ...order, comments: updatedComments };
  } catch (error) {
    console.error(`Error adding comment to order ${orderId} in MySQL:`, error);
    return undefined;
  }
};

export const addReplyToComment = async (
  orderId: string, parentCommentId: string, replyData: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'>
): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const comments = order.comments || [];
    const parentCommentIndex = comments.findIndex(c => c.id === parentCommentId);
    if (parentCommentIndex === -1) throw new Error(`Parent comment ${parentCommentId} not found.`);

    const newReply: Comment = {
      id: uuidv4(),
      userName: replyData.userName,
      userRole: replyData.userRole,
      text: replyData.text,
      isInternal: replyData.isInternal,
      timestamp: new Date().toISOString(),
      replies: [],
      likes: { count: 0, reactedBy: [] },
      ...(replyData.userId && { userId: replyData.userId }),
    };

    const parentComment = comments[parentCommentIndex];
    parentComment.replies = [...(parentComment.replies || []), newReply];
    comments[parentCommentIndex] = parentComment;

    await updateOrder(orderId, { comments });
    return { ...order, comments };
  } catch (error) {
    console.error(`Error adding reply to comment ${parentCommentId} in order ${orderId} in MySQL:`, error);
    return undefined;
  }
};

export const toggleReaction = async (
  orderId: string, targetCommentId: string, isReply: boolean, parentCommentIdIfReply: string | undefined, reactorId: string, reactionType: 'like'
): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const comments = [...(order.comments || [])];
    let targetComment: Comment | undefined;

    if (isReply) {
      if (!parentCommentIdIfReply) throw new Error("parentCommentIdIfReply is required for a reply reaction.");
      const parentComment = comments.find(c => c.id === parentCommentIdIfReply);
      if (!parentComment || !parentComment.replies) throw new Error(`Parent comment ${parentCommentIdIfReply} or its replies not found.`);
      targetComment = parentComment.replies.find(r => r.id === targetCommentId);
    } else {
      targetComment = comments.find(c => c.id === targetCommentId);
    }
    if (!targetComment) throw new Error(`Target comment/reply ${targetCommentId} not found.`);

    targetComment.likes = targetComment.likes || { count: 0, reactedBy: [] };
    const reactedByIndex = targetComment.likes.reactedBy.indexOf(reactorId);
    if (reactedByIndex > -1) {
      targetComment.likes.reactedBy.splice(reactedByIndex, 1);
      targetComment.likes.count = Math.max(0, targetComment.likes.count - 1);
    } else {
      targetComment.likes.reactedBy.push(reactorId);
      targetComment.likes.count += 1;
    }

    await updateOrder(orderId, { comments });
    return { ...order, comments };
  } catch (error) {
    console.error(`Error toggling reaction on comment ${targetCommentId} in order ${orderId} in MySQL:`, error);
    return undefined;
  }
};


export const deleteComment = async (
  orderId: string, targetCommentId: string, isReply: boolean, parentCommentIdIfReply: string | undefined
): Promise<TrackingLink | undefined> => {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    let comments = [...(order.comments || [])];

    if (isReply) {
      if (!parentCommentIdIfReply) throw new Error("parentCommentIdIfReply is required for a reply.");
      const parentCommentIndex = comments.findIndex(c => c.id === parentCommentIdIfReply);
      if (parentCommentIndex === -1) throw new Error(`Parent comment ${parentCommentIdIfReply} not found.`);
      const parentComment = comments[parentCommentIndex];
      parentComment.replies = (parentComment.replies || []).filter(r => r.id !== targetCommentId);
      comments[parentCommentIndex] = parentComment;
    } else {
      comments = comments.filter(c => c.id !== targetCommentId);
    }

    await updateOrder(orderId, { comments });
    return { ...order, comments };
  } catch (error) {
    console.error(`Error deleting comment ${targetCommentId} in order ${orderId} in MySQL:`, error);
    return undefined;
  }
};

export const addShippedOrderEntry = async (orderId: string, trackingCode: string): Promise<boolean> => {
  try {
    await query(
      `INSERT INTO ${SHIPPED_ORDERS_TABLE} (order_id, tracking_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE tracking_code = VALUES(tracking_code)`,
      [orderId, trackingCode]
    );
    console.log(`[ShippedOrders] Upserted entry for order ${orderId} in MySQL`);
    return true;
  } catch (error) {
    console.error(`Error upserting to shippedOrders in MySQL for order ${orderId}:`, error);
    return false;
  }
};

export const deleteShippedOrderEntry = async (orderId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${SHIPPED_ORDERS_TABLE} WHERE order_id = ?`, [orderId]);
    console.log(`[ShippedOrders] Removed entry for order ${orderId} from MySQL`);
    return true;
  } catch (error) {
    console.error(`Error deleting from shippedOrders in MySQL for order ${orderId}:`, error);
    return false;
  }
};

export const getShippedOrders = async (): Promise<{ orderId: string; packzyTrackingCode: string }[]> => {
  try {
    const rows = await query<any[]>(`SELECT order_id, tracking_code FROM ${SHIPPED_ORDERS_TABLE}`);
    return rows.map(row => ({
      orderId: row.order_id,
      packzyTrackingCode: row.tracking_code,
    }));
  } catch (error) {
    console.error("Error fetching shipped orders from MySQL:", error);
    return [];
  }
};



