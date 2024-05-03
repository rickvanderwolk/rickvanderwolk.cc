import ephem
import json
from datetime import datetime

latitude = 52.3676
longitude = 4.9041

observer = ephem.Observer()
observer.lat = str(latitude)
observer.lon = str(longitude)

observer.date = datetime.now()

sun = ephem.Sun(observer)
sun_altitude = sun.alt
sun_azimuth = sun.az

sun_altitude_deg = float(sun_altitude) * (180 / 3.14159)
sun_azimuth_deg = float(sun_azimuth) * (180 / 3.14159)

sun_position = {
    "sun_altitude": sun_altitude_deg,
    "sun_azimuth": sun_azimuth_deg,
    "latitude": latitude,
    "longitude": longitude
}

print(json.dumps(sun_position, indent=2))
