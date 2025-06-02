# Evolutionary Games with Multi-Agents

Theodore Mui <<theodoremui@gmail.com>>

A number of key folders:

- data : this is where all game config & outputs go
- instance : this is the sqlite database storage
- tests : pytest for testing developing


## Initialization of project

If you don't have uv, install uv on a Mac / Linux:
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

For a Windows machine:
```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

To setup the project with all requisite libraries, type the following at the project toplevel:
```
uv sync
```


## Running the Evolutionary Games

### For Mac/Linux Users:
Once the libraries are installed, type at the project toplevel:

```
./run.sh
```

If that has issues, type the following:

```
gunicorn --bind 0.0.0.0:8000 --reuse-port --reload main:application
```

### For Windows Users:
The application uses Waitress as the WSGI server on Windows. You have two options to run the application:

1. Using Waitress (Production-ready):
```
waitress-serve --host=0.0.0.0 --port=8000 main:application
```

2. Using Flask Development Server (Development with auto-reload):
```
python main.py
```

If you encounter port conflicts, change the port from `8000` to `8001` (or any other port that is not being used by other processes).


## Test driven development

Before each checkin, run the following to ensure that all unit test passes

```
pytest
```

---

Sat May  3 16:26:53 PDT 2025

