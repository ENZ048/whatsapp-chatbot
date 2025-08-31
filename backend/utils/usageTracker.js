const Usage = require("../models/usageModel");

async function updateUsage(chatbotId, companyId, userNumber) {
  let usage = await Usage.findOne({ chatbotId });

  if (!usage) {
    usage = new Usage({ chatbotId, companyId, totalMessages: 0, uniqueUsers: [] });
  }

  usage.totalMessages += 1;

  if (!usage.uniqueUsers.includes(userNumber)) {
    usage.uniqueUsers.push(userNumber);
  }

  await usage.save();
}

module.exports = { updateUsage };
