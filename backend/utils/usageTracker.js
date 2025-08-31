import Usage from "../models/Usage.js";

/**
 * Update chatbot usage stats
 * @param {string} chatbotId
 * @param {string} companyId
 * @param {string} userNumber
 */
export async function updateUsage(chatbotId, companyId, userNumber) {
  try {
    let usage = await Usage.findOne({ chatbotId });

    if (!usage) {
      usage = new Usage({
        chatbotId,
        companyId,
        totalMessages: 0,
        uniqueUsers: [],
      });
    }

    // increment messages
    usage.totalMessages += 1;

    // add unique user if not already present
    if (!usage.uniqueUsers.includes(userNumber)) {
      usage.uniqueUsers.push(userNumber);
    }

    await usage.save();
    return usage;
  } catch (err) {
    console.error("❌ Usage update failed:", err.message);
    throw err;
  }
}
