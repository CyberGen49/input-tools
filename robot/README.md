
# Input Tools - Robot

This directory is packaged into an executable by `pkg` and used with Input Tools.

The reason for this is that RobotJS (our library that handles input automation) doesn't play nicely with Electron. The easiest solution is to write a separate Node script for handling that automation, spawn it as a child process from Input Tools, and send commands to it through a websocket.