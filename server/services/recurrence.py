import json
from datetime import datetime, timedelta
from calendar import monthrange


def expand_recurring_events(event_dicts, range_start, range_end):
    """Expand recurring events into individual instances within a date range."""
    result = []
    for event in event_dicts:
        recurrence = event.get('recurrence', '')
        if not recurrence:
            result.append(event)
            continue

        try:
            rule = json.loads(recurrence) if isinstance(recurrence, str) else recurrence
        except (json.JSONDecodeError, TypeError):
            result.append(event)
            continue

        rec_type = rule.get('type', 'none')
        if rec_type == 'none':
            result.append(event)
            continue

        instances = _expand_event(event, rule, range_start, range_end)
        result.extend(instances)

    return result


def _expand_event(event, rule, range_start, range_end):
    start = datetime.fromisoformat(event['start'])
    end = datetime.fromisoformat(event['end'])
    duration = end - start

    rec_type = rule['type']
    rec_end = None
    if rule.get('endDate'):
        rec_end = datetime.fromisoformat(rule['endDate']).replace(
            hour=23, minute=59, second=59
        )

    effective_end = min(range_end, rec_end) if rec_end else range_end
    if start > effective_end:
        return []

    instances = []

    if rec_type == 'daily':
        current = start
        while current <= effective_end:
            inst_end = current + duration
            if inst_end >= range_start:
                instances.append(_make_instance(event, current, inst_end, current != start))
            current += timedelta(days=1)

    elif rec_type in ('weekly', 'biweekly'):
        js_days = rule.get('days', [_to_js_day(start.weekday())])
        py_days = [_to_py_day(d) for d in js_days]
        week_interval = 2 if rec_type == 'biweekly' else 1

        # Anchor on the Monday of the event's start week
        anchor_monday = start - timedelta(days=start.weekday())

        # Optimisation: jump close to range_start if it's far ahead
        if range_start > start:
            range_monday = range_start - timedelta(days=range_start.weekday())
            weeks_diff = (range_monday - anchor_monday).days // 7
            aligned = (weeks_diff // week_interval) * week_interval
            current_monday = anchor_monday + timedelta(weeks=max(0, aligned - week_interval))
        else:
            current_monday = anchor_monday

        while current_monday <= effective_end + timedelta(days=6):
            for py_day in sorted(py_days):
                current = current_monday + timedelta(days=py_day)
                current = current.replace(
                    hour=start.hour, minute=start.minute,
                    second=start.second, microsecond=start.microsecond,
                )
                if current < start or current > effective_end:
                    continue
                inst_end = current + duration
                if inst_end >= range_start:
                    instances.append(
                        _make_instance(event, current, inst_end, current != start)
                    )

            current_monday += timedelta(weeks=week_interval)

    elif rec_type == 'monthly':
        current = start
        while current <= effective_end:
            inst_end = current + duration
            if inst_end >= range_start:
                instances.append(_make_instance(event, current, inst_end, current != start))
            year = current.year
            month = current.month + 1
            if month > 12:
                month = 1
                year += 1
            day = min(start.day, monthrange(year, month)[1])
            current = current.replace(year=year, month=month, day=day)

    elif rec_type == 'yearly':
        current = start
        while current <= effective_end:
            inst_end = current + duration
            if inst_end >= range_start:
                instances.append(_make_instance(event, current, inst_end, current != start))
            try:
                current = current.replace(year=current.year + 1)
            except ValueError:
                # Feb 29 in a non-leap year
                current = current.replace(year=current.year + 1, month=2, day=28)

    return instances


def _make_instance(event, start, end, is_generated):
    instance = dict(event)
    instance['start'] = start.isoformat()
    instance['end'] = end.isoformat()
    if is_generated:
        instance['recurringEventId'] = event['id']
        instance['isRecurringInstance'] = True
        instance['originalStart'] = event['start']
        instance['originalEnd'] = event['end']
    return instance


def _to_js_day(py_weekday):
    """Python weekday (Mon=0 … Sun=6) → JS day (Sun=0 … Sat=6)."""
    return (py_weekday + 1) % 7


def _to_py_day(js_day):
    """JS day (Sun=0 … Sat=6) → Python weekday (Mon=0 … Sun=6)."""
    return (js_day - 1) % 7
