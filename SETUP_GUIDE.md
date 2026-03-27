# Vehicle System Project - Setup Guide

This guide will help you set up and run the Vehicle Registration & Recognition System on your local machine.

## Prerequisites

1.  **Python 3.10+**: [Download Here](https://www.python.org/downloads/)
2.  **Node.js & npm**: [Download Here](https://nodejs.org/en/)
3.  **PostgreSQL**: [Download Here](https://www.postgresql.org/download/)
    *   *Default Password used in project is `1234`. If yours is different, update `reset_db.py` and service `database.py` files.*

---

## 1. Database Setup

The project uses a Python script to automatically initialize the database.

## 1. Database Setup

You need to manually initialize the database using PostgreSQL's command line tool.

1.  Open a terminal in the project root folder.
2.  Login to PostgreSQL:
    ```bash
    psql -U postgres
    ```
3.  Create the database and tables by running the SQL file:
    ```sql
    \i data_setup.sql
    ```
    *   **Note:** If the database `dmt_users` fails to create because it already exists, you can drop it first: `DROP DATABASE dmt_users;` then run `\i data_setup.sql` again.
4.  Exit psql:
    ```sql
    \q
    ```

---

## 2. Backend Setup

The project has 3 microservices. You need to run each in a separate terminal.

### Auth Service (Port 8000)
1.  Open a new terminal.
2.  Navigate to the folder:
    ```bash
    cd auth_service
    ```
3.  Install dependencies (first time only):
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the service:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```

### Vehicle Registry Service (Port 8001)
1.  Open a new terminal.
2.  Navigate to the folder:
    ```bash
    cd vehicle_registry_service
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the service:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8001 --reload
    ```

### ANPR (Plate Recognition) Service (Port 8002)
1.  Open a new terminal.
2.  Navigate to the folder:
    ```bash
    cd anpr_service
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the service:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8002 --reload
    ```

---

## 3. Frontend Setup

1.  Open a new terminal.
2.  Navigate to the frontend folder:
    ```bash
    cd frontend_service
    ```
3.  Run the HTTP server:
    ```bash
    npx http-server www
    ```
4.  The terminal will show a link (usually `http://127.0.0.1:8080`). Open this in your browser.

---

## 4. Default Login Credentials

**Public User:**
- Email: `public@gmail.com`
- Password: `password123`

**Traffic Police:**
- Email: `police@gmail.com`
- Password: `password123`

**DMT Admin:**
- Email: `dmt@gmail.com`
- Password: `password123`
