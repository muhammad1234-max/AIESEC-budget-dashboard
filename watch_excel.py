import time
import os
import subprocess
from datetime import datetime

file_path = 'Copy of AIESEC in KARACHI Budget Tool 26.27.xlsx'
script_path = 'process_data.py'

def get_file_mtime(path):
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0

def main():
    print(f"Watching {file_path} for changes...")
    last_mtime = get_file_mtime(file_path)
    
    while True:
        try:
            time.sleep(2)
            current_mtime = get_file_mtime(file_path)
            
            if current_mtime != last_mtime:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Change detected! Updating dashboard data...")
                # Wait a bit for the save to complete
                time.sleep(1) 
                
                try:
                    result = subprocess.run(['python', script_path], capture_output=True, text=True)
                    if result.returncode == 0:
                        print("Data updated successfully.")
                    else:
                        print("Error updating data:")
                        print(result.stderr)
                except Exception as e:
                    print(f"Failed to run update script: {e}")
                    
                last_mtime = current_mtime
                
        except KeyboardInterrupt:
            print("Stopping watcher...")
            break
        except Exception as e:
            print(f"Error in watcher loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
