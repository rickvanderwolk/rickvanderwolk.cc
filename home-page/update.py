# pip3 install requests

import requests
import json
import time

HOME_PAGE_API_URL_POST_ENDPOINT = '<base_url>/api/post.php?token=<token>'
PHILIPS_HUE_BRIDGE_API_URL = 'http://<bridge_ip>/api/<token>'

PHILIPS_HUE_SENSOR_ID = ''
PHILIPS_HUE_LIGHT_ID = ''

previousPayload = ''

while True:
    try:
        print('Update state')

        r = requests.get(PHILIPS_HUE_BRIDGE_API_URL)

        data = json.loads(r.text)
        sensorState = data['sensors'][PHILIPS_HUE_SENSOR_ID]['state']
        bulbState = data['lights'][PHILIPS_HUE_LIGHT_ID]['state']

        postData = {
            "sensorState": sensorState,
            "bulbState": bulbState
        }
        pload = json.dumps(postData)

        if (pload == previousPayload):
            print('nothing changed, do nothing')
        else:
            print('values changed, post')
            r = requests.post(HOME_PAGE_API_URL_POST_ENDPOINT, data = pload)

        previousPayload = pload
    except:
        print('Something went wrong, try again')

    time.sleep(5)
