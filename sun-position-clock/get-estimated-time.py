import ephem
import json
import sys
import time

REFERENCE_YEAR = 2024
MIN_DAYS_APART = 30

def refine_match(obs, center_date, sun_alt, sun_azi):
    best_date = center_date
    smallest_diff = float('inf')
    attempts = 0

    low = float(center_date - ephem.minute * 30)
    high = float(center_date + ephem.minute * 30)

    for _ in range(60):
        mid = (low + high) / 2
        obs.date = ephem.Date(mid)
        sun = ephem.Sun(obs)
        attempts += 1

        total_diff = float(abs(sun.alt - sun_alt)) + float(abs(sun.az - sun_azi))

        if total_diff < smallest_diff:
            smallest_diff = total_diff
            best_date = obs.date

        obs.date = ephem.Date(mid + ephem.minute)
        sun_forward = ephem.Sun(obs)
        attempts += 1
        forward_diff = float(abs(sun_forward.alt - sun_alt)) + float(abs(sun_forward.az - sun_azi))

        if forward_diff < total_diff:
            low = mid
        else:
            high = mid

    return best_date.datetime(), smallest_diff, attempts

def find_time_for_sun_position(lat, lon, sun_alt, sun_azi):
    obs = ephem.Observer()
    obs.lat = str(lat)
    obs.lon = str(lon)
    total_attempts = 0

    start_date = ephem.Date(f'{REFERENCE_YEAR}/01/01')
    end_date = ephem.Date(f'{REFERENCE_YEAR}/12/31')

    matches = []

    current_date = start_date
    while current_date <= end_date:
        for minute in range(0, 1440, 30):
            obs.date = current_date + ephem.minute * minute
            sun = ephem.Sun(obs)
            total_attempts += 1

            alt_diff = float(abs(sun.alt - sun_alt))
            azi_diff = float(abs(sun.az - sun_azi))
            total_diff = alt_diff + azi_diff

            if total_diff < ephem.degrees('6:00:00'):
                matches.append((total_diff, obs.date))

        current_date += 1

    matches.sort(key=lambda m: m[0])

    best = None
    second = None

    for diff, date in matches:
        if best is None:
            best = (diff, date)
        elif second is None and abs(float(date) - float(best[1])) > MIN_DAYS_APART:
            second = (diff, date)
            break

    results = []
    for match in [best, second]:
        if match:
            refined, _, refine_attempts = refine_match(obs, match[1], sun_alt, sun_azi)
            total_attempts += refine_attempts
            results.append(refined)
        else:
            results.append(None)

    return results, total_attempts

start_time = time.time()

input_data = json.loads(sys.argv[1])
sun_altitude = ephem.degrees(str(input_data['sun_altitude']))
sun_azimuth = ephem.degrees(str(input_data['sun_azimuth']))
latitude = input_data['latitude']
longitude = input_data['longitude']

matches, attempts = find_time_for_sun_position(latitude, longitude, sun_altitude, sun_azimuth)

elapsed_time_ms = (time.time() - start_time) * 1000

def format_match(match):
    if match:
        return {"date": match.strftime('%d %b'), "time": match.strftime('%H:%M:%S')}
    return {"date": "Not found", "time": "Not found"}

result = {
    "altitude": str(sun_altitude),
    "azimuth": str(sun_azimuth),
    "latitude": latitude,
    "longitude": longitude,
    "estimated": [format_match(m) for m in matches],
    "attempts": attempts,
    "elapsed_time_in_ms": round(elapsed_time_ms, 4)
}

print(json.dumps(result, indent=4))
