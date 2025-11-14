import { addActivities, addSlackEodMessages } from "@/lib/db";
import { Activity } from "@/types/db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function main() {
  // Check for LEADERBOARD_DATA_PATH environment variable
  const flatDataPath = process.env.LEADERBOARD_DATA_PATH;
  if (!flatDataPath) {
    throw new Error("LEADERBOARD_DATA_PATH environment variable is not set");
  }

  // Import activities
  const inputDir = join(flatDataPath, "data", "slack", "activities");
  console.log(`Reading JSON files from: ${inputDir}`);

  let allActivities: Activity[] = [];

  // Check if directory exists
  if (!existsSync(inputDir)) {
    console.log(`Directory does not exist: ${inputDir}`);
    console.log("Skipping activities import.");
  } else {
    // Read all JSON files from the directory
    const files = await readdir(inputDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));
    console.log(`Found ${jsonFiles.length} JSON files`);

    if (jsonFiles.length === 0) {
      console.log("No JSON files found. Skipping activities import.");
    } else {
      // Read and parse all activities
      for (const file of jsonFiles) {
        const filePath = join(inputDir, file);
        const content = await readFile(filePath, "utf-8");
        const activities = JSON.parse(content) as Activity[];

        // Convert occured_at strings back to Date objects
        for (const activity of activities) {
          activity.occured_at = new Date(activity.occured_at);
        }

        allActivities.push(...activities);

        if (allActivities.length % 1000 === 0) {
          console.log(
            `Progress: Loaded ${allActivities.length} activities so far...`
          );
        }
      }

      console.log(
        `Loaded ${allActivities.length} total activities from ${jsonFiles.length} files`
      );

      // Add activities to database
      console.log("Adding activities to database...");
      await addActivities(allActivities);

      console.log("✓ Successfully imported all activities");
    }
  }

  // Import Slack EOD messages
  console.log("\nImporting Slack EOD messages...");
  const eodInputDir = join(flatDataPath, "data", "slack", "eod_messages");
  console.log(`Reading JSON files from: ${eodInputDir}`);

  let allEodMessages: {
    id: number;
    user_id: string;
    timestamp: Date;
    text: string;
  }[] = [];

  // Check if directory exists
  if (!existsSync(eodInputDir)) {
    console.log(`Directory does not exist: ${eodInputDir}`);
    console.log("Skipping EOD messages import.");
  } else {
    // Read all JSON files from the directory
    const eodFiles = await readdir(eodInputDir);
    const eodJsonFiles = eodFiles.filter((file) => file.endsWith(".json"));
    console.log(`Found ${eodJsonFiles.length} JSON files`);

    if (eodJsonFiles.length === 0) {
      console.log("No JSON files found. Skipping EOD messages import.");
    } else {
      // Read and parse all EOD messages
      for (const file of eodJsonFiles) {
        const filePath = join(eodInputDir, file);
        const content = await readFile(filePath, "utf-8");
        const messages = JSON.parse(content) as {
          id: number;
          user_id: string;
          timestamp: string;
          text: string;
        }[];

        // Convert timestamp strings back to Date objects
        for (const message of messages) {
          allEodMessages.push({
            id: message.id,
            user_id: message.user_id,
            timestamp: new Date(message.timestamp),
            text: message.text,
          });
        }

        if (allEodMessages.length % 1000 === 0) {
          console.log(
            `Progress: Loaded ${allEodMessages.length} EOD messages so far...`
          );
        }
      }

      console.log(
        `Loaded ${allEodMessages.length} total EOD messages from ${eodJsonFiles.length} files`
      );

      // Add EOD messages to database
      console.log("Adding EOD messages to database...");
      await addSlackEodMessages(allEodMessages);

      console.log("✓ Successfully imported all EOD messages");
    }
  }

  // Check if nothing was imported
  if (allActivities.length === 0 && allEodMessages.length === 0) {
    console.log(
      "\nNo data to import. Both activities and EOD messages are empty."
    );
    return;
  }

  console.log("\n✓ Import completed successfully");
}

main();
