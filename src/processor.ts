import { saveErrorData, saveRejectionData } from "./helpers/database";
import { sendWebhookNotification } from "./helpers/webhook";

interface EventRecord {
  body: string;
}

interface LambdaEvent {
  Records: EventRecord[];
}

export const handler = async (event: LambdaEvent) => {
  for (const record of event.Records) {
    const { data } = JSON.parse(record.body);

    try {
      if (data.error) {
        const { success } = await saveErrorData(data);
        
        if (success) {
          sendWebhookNotification(data.project_id); // fire-and-forget
        } else {
          console.error('Error saving error data to PostgreSQL'); 
        }
      } else {
        const { success } = await saveRejectionData(data);

        if (success) {
          sendWebhookNotification(data.project_id); // fire-and-forget
        } else {
          console.error('Error saving rejection data to PostgreSQL');
        }
      }
    } catch (e) {
      console.error("Error processing record:", e);
    }
  }
};