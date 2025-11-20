export enum ActivityDefinition {
  EOD_UPDATE = "eod_update",
}

export interface Activity {
  slug: string;
  contributor: string;
  activity_definition: ActivityDefinition;
  title: string | null;
  occured_at: Date;
  link: string | null;
  text: string | null;
  points: number | null;
  meta: Record<string, unknown> | null;
}

interface DurationAggregateValue {
  type: "duration";
  value: number;
}

interface NumberAggregateValue {
  type: "number";
  value: number;
}

interface StringAggregateValue {
  type: "string";
  value: string;
}

interface PercentageAggregateValue {
  type: "percentage";
  value: number; // Float between 0 and 1
}

export type AggregateValue =
  | DurationAggregateValue
  | NumberAggregateValue
  | StringAggregateValue
  | PercentageAggregateValue;

interface AggregateDefinitionBase {
  slug: string;
  name: string;
  description: string | null;
}

export interface GlobalAggregate extends AggregateDefinitionBase {
  value: AggregateValue | null;
}

export type ContributorAggregateDefinition = AggregateDefinitionBase;

export interface ContributorAggregate {
  aggregate: string; // FK to contributor_aggregate_definition.slug
  contributor: string; // FK to contributor.username
  value: AggregateValue;
}
