import { getAllSlackEodMessages, getDb } from "@/lib/db";
import { Activity, ActivityDefinition } from "@/types/db";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const db = getDb();

  // Check for LEADERBOARD_DATA_PATH environment variable
  const flatDataPath = process.env.LEADERBOARD_DATA_PATH;
  if (!flatDataPath) {
    throw new Error("LEADERBOARD_DATA_PATH environment variable is not set");
  }

  // Get all activity definitions managed by this scraper
  const managedActivityDefinitions = Object.values(ActivityDefinition);
  const placeholders = managedActivityDefinitions
    .map((_, i) => `$${i + 1}`)
    .join(", ");

  console.log("Querying activities from database...");
  const result = await db.query<Activity>(
    `SELECT * FROM activity WHERE activity_definition IN (${placeholders})`,
    managedActivityDefinitions
  );
  const activities = result.rows;
  console.log(`Found ${activities.length} activities`);

  // Group activities by contributor
  console.log("Grouping activities by contributor...");
  const activitiesByContributor = new Map<string, Activity[]>();

  for (const activity of activities) {
    const contributor = activity.contributor;
    if (!activitiesByContributor.has(contributor)) {
      activitiesByContributor.set(contributor, []);
    }
    activitiesByContributor.get(contributor)!.push(activity);
  }

  console.log(`Found ${activitiesByContributor.size} unique contributors`);

  // Create output directory
  const outputDir = join(flatDataPath, "data", "slack", "activities");
  console.log(`Creating output directory: ${outputDir}`);
  await mkdir(outputDir, { recursive: true });

  // Write JSON files for each contributor
  console.log("Writing JSON files...");
  let filesWritten = 0;

  for (const [contributor, contributorActivities] of activitiesByContributor) {
    const filePath = join(outputDir, `${contributor}.json`);
    await writeFile(
      filePath,
      JSON.stringify(contributorActivities, null, 2),
      "utf-8"
    );
    filesWritten++;

    if (filesWritten % 10 === 0) {
      console.log(
        `Progress: ${filesWritten}/${activitiesByContributor.size} files written`
      );
    }
  }

  console.log(
    `✓ Successfully exported ${filesWritten} contributor activity files to ${outputDir}`
  );

  // Export Slack EOD messages
  console.log("\nExporting Slack EOD messages...");
  const eodMessages = await getAllSlackEodMessages();
  console.log(`Found ${eodMessages.length} EOD messages`);

  if (eodMessages.length > 0) {
    // Group EOD messages by user_id
    console.log("Grouping EOD messages by user...");
    const eodMessagesByUser = new Map<string, typeof eodMessages>();

    for (const message of eodMessages) {
      const userId = message.user_id;
      if (!eodMessagesByUser.has(userId)) {
        eodMessagesByUser.set(userId, []);
      }
      eodMessagesByUser.get(userId)!.push(message);
    }

    console.log(
      `Found ${eodMessagesByUser.size} unique users with EOD messages`
    );

    // Create output directory for EOD messages
    const eodOutputDir = join(flatDataPath, "data", "slack", "eod_messages");
    console.log(`Creating EOD output directory: ${eodOutputDir}`);
    await mkdir(eodOutputDir, { recursive: true });

    // Write JSON files for each user
    console.log("Writing EOD message JSON files...");
    let eodFilesWritten = 0;

    for (const [userId, userMessages] of eodMessagesByUser) {
      const filePath = join(eodOutputDir, `${userId}.json`);
      await writeFile(filePath, JSON.stringify(userMessages, null, 2), "utf-8");
      eodFilesWritten++;

      if (eodFilesWritten % 10 === 0) {
        console.log(
          `Progress: ${eodFilesWritten}/${eodMessagesByUser.size} EOD files written`
        );
      }
    }

    console.log(
      `✓ Successfully exported ${eodFilesWritten} user EOD message files to ${eodOutputDir}`
    );
  } else {
    console.log("No EOD messages to export");
  }
}

main();
