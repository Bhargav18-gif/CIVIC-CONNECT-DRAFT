/**
 * CivicConnect Automated Notification Dispatcher
 * Dispatches contextual notifications for citizens, field engineers, and admin supervisors.
 * Logs event notifications to Firestore `notifications` collection and triggers email when configured.
 */

async function dispatchNotification({
  recipientType, // "citizen", "engineer", "admin"
  recipientId,
  recipientEmail,
  complaintId,
  eventType,
  title,
  message,
  db
}) {
  const notificationRecord = {
    recipientType,
    recipientId: recipientId || null,
    recipientEmail: recipientEmail || null,
    complaintId,
    eventType,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };

  console.log(`[NOTIFICATION -> ${recipientType.toUpperCase()}]: ${title} (Complaint: ${complaintId})`);

  if (db) {
    try {
      await db.collection("notifications").add(notificationRecord);
    } catch (err) {
      console.warn("Failed to persist notification in Firestore:", err.message);
    }
  }

  return notificationRecord;
}

module.exports = {
  dispatchNotification
};
