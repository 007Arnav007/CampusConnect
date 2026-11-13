import socket
import subprocess
import threading
import sys

def get_wsl_ip():
    try:
        out = subprocess.check_output(["wsl", "hostname", "-I"], text=True)
        return out.strip().split()[0]
    except Exception as e:
        print(f"Failed to get WSL IP: {e}")
        return "172.31.206.70"

def forward(src, dst):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except Exception:
        pass
    finally:
        src.close()
        dst.close()

def handle_client(client_socket, target_ip, target_port):
    try:
        server_socket = socket.create_connection((target_ip, target_port), timeout=5)
        server_socket.settimeout(None)
        client_socket.settimeout(None)
    except Exception as e:
        client_socket.close()
        return

    t1 = threading.Thread(target=forward, args=(client_socket, server_socket), daemon=True)
    t2 = threading.Thread(target=forward, args=(server_socket, client_socket), daemon=True)
    t1.start()
    t2.start()

def main():
    target_ip = get_wsl_ip()
    target_port = 5432
    listen_port = 5432

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", listen_port))
    server.listen(128)
    print(f"PG proxy listening on 127.0.0.1:{listen_port} -> {target_ip}:{target_port}", flush=True)

    while True:
        try:
            client, _ = server.accept()
            threading.Thread(target=handle_client, args=(client, target_ip, target_port), daemon=True).start()
        except KeyboardInterrupt:
            break
        except Exception:
            pass

if __name__ == "__main__":
    main()
