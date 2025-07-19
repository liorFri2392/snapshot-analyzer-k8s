### What is this

This analyzer accept a snapshot uploaded and provides an OpenLense like interface to explore the snapshot locally.

### Tech 
It was created with Python as a backend and React as a frontend. So to run it you will have to have both installed. Please refer to relevant documentation on how to get yourself going with Python and React.

### How to run
For simplicity a wrapper script has been created. It relies on my locac `python3.11` binary, so if you're using anything else - consider changing it. 

This was tested only with Python 3.11, so no guarantee it will run under anything else for now.

`./start.sh` from the root of the directory

If the browser was not automatically opened, please open it at `http://localhost:3000`

#### Dockerized version

Run `docker compose up` and then open `http://localhost:3000` in your browser.
