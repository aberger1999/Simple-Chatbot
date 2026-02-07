from flask import Flask, render_template, request, redirect, g, url_for, jsonify
from chat import get_response
import joblib

#Data Processing Modules
import pandas as pd
import numpy as np

app = Flask(__name__)

@app.route("/")
def homepage():
    return render_template("home.html")

@app.route("/blog")
def blog():
    return render_template("blog.html")

@app.route("/projects")
def projects():
    return render_template("projects.html")

@app.post("/predict")
def predict():
    text = request.get_json().get("message")
    response = get_response(text)
    message = {"answer": response}
    return jsonify(message)
    
if __name__ == "__main__":
    app.run(debug=True)