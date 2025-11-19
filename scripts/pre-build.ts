import {
  getDb,
  upsertContributorAggregates,
  upsertGlobalAggregates,
} from "@/lib/db";

/**
 * Calculate EOD Consistency for all contributors
 * 
 * This calculates what percentage of expected workdays (Mon-Fri) each contributor
 * has posted EOD updates since their first EOD.
 * 
 * Formula:
 * - Find earliest EOD date for each contributor
 * - Count total EOD activities
 * - Calculate days between earliest and today
 * - Expected workdays = days_between * 5 / 7 (excluding weekends)
 * - Consistency = min(1.0, eod_count / expected_workdays)
 */
async function calculateAndUpsertEodConsistency() {
  const db = getDb();

  // Query all EOD activities grouped by contributor
  const result = await db.query<{
    contributor: string;
    earliest_eod: string;
    eod_count: string;
  }>(
    `SELECT 
       contributor,
       MIN(occured_at) as earliest_eod,
       COUNT(*) as eod_count
     FROM activity 
     WHERE activity_definition = 'eod_update'
     GROUP BY contributor`
  );

  if (result.rows.length === 0) {
    console.log("No EOD activities found.");
    return;
  }

  const contributorAggregates = [];
  const allConsistencies: number[] = [];
  const today = new Date();

  for (const row of result.rows) {
    const earliestEodDate = new Date(row.earliest_eod);
    const eodCount = Number(row.eod_count);

    // Calculate days between earliest EOD and today
    const timeDiff = today.getTime() - earliestEodDate.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Calculate expected workdays (Mon-Fri only)
    // Approximate using 5/7 ratio
    const expectedWorkdays = Math.round(totalDays * 5 / 7);

    // Avoid division by zero
    if (expectedWorkdays === 0) {
      continue;
    }

    // Calculate consistency percentage (cap at 1.0 = 100%)
    const consistency = Math.min(1.0, eodCount / expectedWorkdays);

    contributorAggregates.push({
      aggregate: "eod_consistency",
      contributor: row.contributor,
      value: {
        type: "percentage" as const,
        value: consistency,
      },
    });

    allConsistencies.push(consistency);
  }

  // Upsert contributor aggregates
  if (contributorAggregates.length > 0) {
    await upsertContributorAggregates(contributorAggregates);
    console.log(
      `Updated EOD consistency for ${contributorAggregates.length} contributors`
    );
  }

  // Calculate global average consistency
  if (allConsistencies.length > 0) {
    const globalAvg =
      allConsistencies.reduce((sum, c) => sum + c, 0) / allConsistencies.length;

    await upsertGlobalAggregates([
      {
        slug: "eod_consistency",
        name: "EOD Consistency",
        description: "Percentage of expected workdays with EOD updates",
        value: {
          type: "percentage",
          value: globalAvg,
        },
      },
    ]);
    console.log(
      `Updated global EOD consistency: ${(globalAvg * 100).toFixed(1)}%`
    );
  }
}

async function main() {
  // Calculate and store EOD consistency aggregates
  await calculateAndUpsertEodConsistency();
}

main();

