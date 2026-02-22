"use strict";
/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Application requires manual enabling for environments other than Production.
   */
  agent_enabled:
    process.env.NODE_ENV === "production" &&
    (!!process.env.NEW_RELIC || !!process.env.NEW_RELIC_LICENSE_KEY),
  /**
   * Array of application names.
   */
  app_name: [process.env.NEW_RELIC_APP_NAME || "10xcoder-api"],
  /**
   * Your New Relic license key.
   */
  license_key: process.env.NEW_RELIC_LICENSE_KEY || process.env.NEW_RELIC,
  /**
   * Enable AI monitoring.
   */
  ai_monitoring: {
    enabled: process.env.NEW_RELIC_AI_MONITORING_ENABLED === "true",
  },
  /**
   * Custom insights events sample storage limit.
   */
  custom_insights_events: {
    max_samples_stored: process.env
      .NEW_RELIC_CUSTOM_INSIGHTS_EVENTS_MAX_SAMPLES_STORED
      ? parseInt(
          process.env.NEW_RELIC_CUSTOM_INSIGHTS_EVENTS_MAX_SAMPLES_STORED,
          10,
        )
      : 1000,
  },
  /**
   * Span events sample storage limit.
   */
  span_events: {
    max_samples_stored: process.env.NEW_RELIC_SPAN_EVENTS_MAX_SAMPLES_STORED
      ? parseInt(process.env.NEW_RELIC_SPAN_EVENTS_MAX_SAMPLES_STORED, 10)
      : 1000,
  },
  /**
   * This setting controls distributed tracing.
   * Distributed tracing lets you see the path that a request takes through your
   * distributed system. Enabling distributed tracing changes the behavior of some
   * New Relic features, so carefully consult the transition guide before you enable
   * this feature: https://docs.newrelic.com/docs/transition-guide-distributed-tracing
   * Default is true.
   */
  distributed_tracing: {
    enabled: true,
  },
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: "info",
  },
  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,
  attributes: {
    /**
     * Prefix of attributes to exclude from all destinations. Allows * as wildcard
     * at end.
     *
     * NOTE: If excluding headers, they must be in camelCase form to be filtered.
     *
     * @env NEW_RELIC_ATTRIBUTES_EXCLUDE
     */
    exclude: [
      "request.headers.cookie",
      "request.headers.authorization",
      "request.headers.proxyAuthorization",
      "request.headers.setCookie*",
      "request.headers.x*",
      "response.headers.cookie",
      "response.headers.authorization",
      "response.headers.proxyAuthorization",
      "response.headers.setCookie*",
      "response.headers.x*",
    ],
  },
};
