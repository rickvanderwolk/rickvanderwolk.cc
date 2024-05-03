from flask import Flask
import subprocess

api = Flask(__name__)

@api.route('/')
def hello():
    command1 = ["python3", "get-sun-position.py"]
    result1 = subprocess.run(command1, stdout=subprocess.PIPE)
    sun_position = result1.stdout.decode('utf-8').strip()

    command2 = ["python3", "get-estimated-time.py", sun_position]
    result2 = subprocess.run(command2, stdout=subprocess.PIPE)
    estimated_time = result2.stdout.decode('utf-8').strip()

    return f"{estimated_time}"

if __name__ == "__main__":
    api.run()
