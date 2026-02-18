"""
Novu notification service — async trigger functions for each workflow.

Each function calls the Novu Events API trigger endpoint via httpx.
The subscriberId should match the frontend NotificationInbox component's
subscriberId (currently the user's email address).

=== Novu Dashboard Workflow Setup ===

The following workflow identifiers must be created in the Novu dashboard
(https://web.novu.co) before notifications will be delivered:

1. habit-reminder
   - Trigger: trigger_habit_reminder(subscriber_id, habit_name)
   - Payload: { habitName: str }
   - Suggested template: "Time to log your habit: {{habitName}}"

2. goal-deadline-approaching
   - Trigger: trigger_goal_deadline(subscriber_id, goal_name, deadline)
   - Payload: { goalName: str, deadline: str (ISO date) }
   - Suggested template: "Your goal '{{goalName}}' deadline is {{deadline}}"

3. journal-daily-prompt
   - Trigger: trigger_journal_prompt(subscriber_id)
   - Payload: {} (no extra data)
   - Suggested template: "Time to write in your journal today!"

4. focus-session-complete
   - Trigger: trigger_focus_complete(subscriber_id, duration_minutes, session_title)
   - Payload: { durationMinutes: int, sessionTitle: str }
   - Suggested template: "Focus session '{{sessionTitle}}' complete — {{durationMinutes}} min"

5. weekly-review-ready
   - Trigger: trigger_weekly_review(subscriber_id)
   - Payload: {} (no extra data)
   - Suggested template: "Your weekly review is ready — take a look at your progress!"

6. calendar-event-reminder
   - Trigger: trigger_event_reminder(subscriber_id, event_title, event_time, minutes_before, user_name)
   - Payload: { eventTitle: str, eventTime: str (ISO), minutesBefore: int, userName: str }
   - Suggested template: "Reminder: {{eventTitle}} starts in {{minutesBefore}} minutes"

7. calendar-daily-schedule
   - Trigger: trigger_daily_schedule(subscriber_id, events_today, total_events, user_name)
   - Payload: { eventsToday: [{title: str, time: str}], totalEvents: int, userName: str }
   - Suggested template: "Good morning {{userName}}! You have {{totalEvents}} events today."
"""

import logging
import httpx
from server.config import settings

logger = logging.getLogger(__name__)

NOVU_API_URL = "https://api.novu.co/v1/events/trigger"


async def _trigger(workflow_id: str, subscriber_id: str, payload: dict) -> dict | None:
    """Call the Novu Events API trigger endpoint."""
    api_key = settings.NOVU_API_KEY
    if not api_key:
        logger.warning("NOVU_API_KEY not set — skipping notification trigger")
        return None

    async with httpx.AsyncClient() as client:
        response = await client.post(
            NOVU_API_URL,
            headers={
                "Authorization": f"ApiKey {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "name": workflow_id,
                "to": {"subscriberId": subscriber_id},
                "payload": payload,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()


async def trigger_habit_reminder(subscriber_id: str, habit_name: str) -> dict | None:
    """Trigger a habit reminder notification."""
    return await _trigger(
        "habit-reminder",
        subscriber_id,
        {"habitName": habit_name},
    )


async def trigger_goal_deadline(
    subscriber_id: str, goal_name: str, deadline: str
) -> dict | None:
    """Trigger a goal deadline approaching notification."""
    return await _trigger(
        "goal-deadline-approaching",
        subscriber_id,
        {"goalName": goal_name, "deadline": deadline},
    )


async def trigger_journal_prompt(subscriber_id: str) -> dict | None:
    """Trigger a daily journal prompt notification."""
    return await _trigger(
        "journal-daily-prompt",
        subscriber_id,
        {},
    )


async def trigger_focus_complete(
    subscriber_id: str, duration_minutes: int, session_title: str
) -> dict | None:
    """Trigger a focus session complete notification."""
    return await _trigger(
        "focus-session-complete",
        subscriber_id,
        {"durationMinutes": duration_minutes, "sessionTitle": session_title},
    )


async def trigger_weekly_review(subscriber_id: str) -> dict | None:
    """Trigger a weekly review ready notification."""
    return await _trigger(
        "weekly-review-ready",
        subscriber_id,
        {},
    )


async def trigger_password_reset(
    subscriber_id: str, user_name: str, reset_link: str
) -> dict | None:
    """Trigger a password reset email notification."""
    return await _trigger(
        "password-reset",
        subscriber_id,
        {"userName": user_name, "resetLink": reset_link},
    )


async def trigger_event_reminder(
    subscriber_id: str,
    event_title: str,
    event_time: str,
    minutes_before: int,
    user_name: str = "",
) -> dict | None:
    """Trigger a calendar event reminder notification."""
    return await _trigger(
        "calendar-event-reminder",
        subscriber_id,
        {
            "eventTitle": event_title,
            "eventTime": event_time,
            "minutesBefore": minutes_before,
            "userName": user_name,
        },
    )


async def trigger_daily_schedule(
    subscriber_id: str,
    events_today: list[dict],
    total_events: int,
    user_name: str = "",
) -> dict | None:
    """Trigger a daily schedule summary notification."""
    return await _trigger(
        "calendar-daily-schedule",
        subscriber_id,
        {
            "eventsToday": events_today,
            "totalEvents": total_events,
            "userName": user_name,
        },
    )
