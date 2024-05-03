import ephem
import json
import sys
import time

def find_time_for_sun_position(lat, lon, sun_alt, sun_azi):
    obs = ephem.Observer()
    obs.lat = str(lat)
    obs.lon = str(lon)
    attempts = 0

    for day_offset in range(-3, 4):
        obs.date = ephem.Date('2024/05/01') + day_offset

        for minute in range(1440):
            attempts += 1
            obs.date += ephem.minute * minute
            sun = ephem.Sun(obs)

            if abs(sun.alt - sun_alt) < ephem.degrees('0:30:00') and abs(sun.az - sun_azi) < ephem.degrees('5:00:00'):
                return obs.date.datetime(), attempts

    return None, attempts

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
    "estimated_time": approx_time.strftime('%H:%M:%S') if approx_time else "Not found",
    "attempts": attempts,
    "elapsed_time_in_ms": round(elapsed_time_ms, 4)
}

print(json.dumps(result, indent=4))
