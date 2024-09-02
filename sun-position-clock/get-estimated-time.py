import ephem
import json
import sys
import time

def find_time_for_sun_position(lat, lon, sun_alt, sun_azi):
    obs = ephem.Observer()
    obs.lat = str(lat)
    obs.lon = str(lon)
    attempts = 0

    start_date = ephem.Date('2024/01/01')
    end_date = ephem.Date('2024/12/31')

    best_match_date = None
    smallest_diff = float('inf')

    current_date = start_date
    while current_date <= end_date:
        obs.date = current_date

        for minute in range(0, 1440, 5):
            obs.date += ephem.minute * minute
            attempts += 1
            sun = ephem.Sun(obs)

            alt_diff = abs(sun.alt - sun_alt)
            azi_diff = abs(sun.az - sun_azi)

            if alt_diff < ephem.degrees('0:30:00') and azi_diff < ephem.degrees('5:00:00'):
                if alt_diff + azi_diff < smallest_diff:
                    smallest_diff = alt_diff + azi_diff
                    best_match_date = obs.date.datetime()

        current_date += 1

    return best_match_date, attempts

start_time = time.time()

input_data = json.loads(sys.argv[1])
sun_altitude = ephem.degrees(str(input_data['sun_altitude']))
sun_azimuth = ephem.degrees(str(input_data['sun_azimuth']))
latitude = input_data['latitude']
longitude = input_data['longitude']

approx_time, attempts = find_time_for_sun_position(latitude, longitude, sun_altitude, sun_azimuth)

elapsed_time_ms = (time.time() - start_time) * 1000

result = {
    "altitude": str(sun_altitude),
    "azimuth": str(sun_azimuth),
    "latitude": latitude,
    "longitude": longitude,
    "estimated_time": approx_time.strftime('%Y-%m-%d %H:%M:%S') if approx_time else "Not found",
    "attempts": attempts,
    "elapsed_time_in_ms": round(elapsed_time_ms, 4)
}

print(json.dumps(result, indent=4))
