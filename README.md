# Windows Setup

## 1. Create Virtual Environment Python 3.13

```bash
$ python3.13 -m venv .venv
```

## 2. Activate Virtual Environment (.venv)

### Activate Windows Bash

```bash
$ source .venv/Scripts/activate
```

### Activate Windows CMD

```bash
venv\Scripts\activate
```

### Activate (Mac/Linux)

```bash
source venv/bin/activate
```

## 3. Install Dependencies

```bash
$ pip install -r requirements.txt
```

## 4. Setup Environment

### SECRET_KEY
For JWT encoding.

Rename .env.example file to .env.

```bash
$ python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy generated secret key and replace secret key in .env file. 

## 5. Setup MySQL Database
For SQL connection <br>

Ensure XAMPP and MySQLWorkbench is installed. <br>

Run XAMPP for MySQL <br>
Create Local Database using MySQLWorkbench - database_name: inf2003 <br>
Charset/Collation: utf8, utf8_unicode_ci <br>

#### To Create Tables Using sqlalchemy
In command prompt,
```bash
$ python -c "import app.dal.mysql.mysql_models; from app.core.mysql_client import create_db_tables; create_db_tables()"
```
Table schema should be created in MySQL database.

#### Import data into MySQL Database
In MySQL Workbench, in same database created, click on Server > Data Import. <br>
Select Import from Self-Contained File. <br>
Select 'Dump20251102' SQL Text File from data folder. <br>
Set Default Target Schema to the database. <br>
Select Dump Structure and Data in dropdown below. <br>
Start Import. <br>
Repeat for 'Dump20251117'. <br>

The database tables should be filled with data. <br>
To confirm, run
```bash
select * from user;
```
List of users and details should appear. <br>

In .env file, modify MYSQL_DATABASE_URL accordingly - "mysql+pymysql://< username>:< password>@localhost/< database_name>"

## 6. Setup MongoDB Database
For MongoDB connection <br>

Ensure MongoDB Community Server is installed. <br>
During installation, ensure:
- MongoDB Server (required)
- MongoDB Compass (optional GUI)
- Install as a Service (recommended)

MongoDB will run automatically on: mongodb://localhost:27017.

#### Create Database
Using MongoDB Compass: <br>
Open Compass. <br>
Connect to: mongodb://localhost:27017. <br>
Click Create Database, name it inf2003. <br>
Create collections for posts and comments. <br>

#### Import data into MongoDB Database
Click on comments collection in the inf2003 database. <br>
Click on Collection > Import Data <br>
Select inf2003.comments. <br>
Import. <br>
Comments data should appear in the collection. <br>
Repeat for posts collection with inf2003.posts. <br>

Check the connection:
```bash
python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
print(client.list_database_names())
```

## 7. Run the Website Application
To run, ensure the 2 servers below are running.

### Run using VSCode Debugger (launch.json)
In VSCode, with the project folder open, run and debug using FastAPI: Debug (main.py). <br>
Alternatively, you can also press F5. <br>

This starts the backend server on http://localhost:8000.

### Run using VSCode Debugger (launch.json)
Ensure Live Server is installed in VSCode. <br>
With the project folder open, Go Live to run live server. <br>

This starts the frontend web server on http://127.0.0.1:5500.

### Launch the Website
Enter the address: <br>
http://127.0.0.1:5500/templates/index.html 

This will bring you to the portal's log in page. <br>
You can login as student, faculty or admin using the provided credentials.

## Others

### Delete Virtual Environment

```bash
$ rm -rf .venv
```
