import imp
import os
import sys
from api import api

sys.path.insert(0, os.path.dirname(__file__))

wsgi = imp.load_source('wsgi', 'api.py')
application = wsgi.api
