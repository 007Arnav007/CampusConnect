import subprocess, os, sys

env_file = r"D:\VIT\5th sem\CNT\files\CampusConnect_v2\CampusConnect\.env"
env = os.environ.copy()

with open(env_file) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, _, v = line.partition('=')
        env[k.strip()] = v.strip()

env['FEATURE_ACADEMICS'] = 'true'
env['DATABASE_URL'] = 'jdbc:postgresql://172.31.206.70:5432/campusconnect?sslmode=disable'
env['SPRING_DATASOURCE_URL'] = 'jdbc:postgresql://172.31.206.70:5432/campusconnect?sslmode=disable'


jar = r"D:\VIT\5th sem\CNT\files\CampusConnect_v2\CampusConnect\backend\target\campusconnect-backend-0.0.1-SNAPSHOT.jar"
proc = subprocess.Popen(['java', '-jar', jar], env=env, stdout=sys.stdout, stderr=sys.stderr)
proc.wait()
