from flask import Flask, jsonify, render_template
import pandas as pd

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_dji_data')
def get_dji_data():
    # 데이터 불러오기
    dji = pd.read_csv("static/data/DJI_data.csv")

    # js로 시각화 가능하게 데이터 타입 변환하기
    dji["날짜"] = pd.to_datetime(dji["날짜"].str.replace(" ", ""), format="%Y-%m-%d")
    dji["종가"] = dji["종가"].str.replace(",", "").astype(float)
    dji["시가"] = dji["시가"].str.replace(",", "").astype(float)
    dji["고가"] = dji["고가"].str.replace(",", "").astype(float)
    dji["저가"] = dji["저가"].str.replace(",", "").astype(float)
    dji["거래량"] = dji["거래량"].str.replace("M", "").astype(float) * 1_000_000  
    dji["변동 %"] = dji["변동 %"].str.replace("%", "").astype(float)

    # 날짜순으로 정렬하기
    dji = dji.sort_values(by="날짜").reset_index(drop=True)

    return jsonify(dji.to_dict(orient='records'))

@app.route('/get_edge_data')
def get_edge_data():
    edge = pd.read_csv('static/data/edge.csv')

    return jsonify(edge.to_dict(orient='records'))

if __name__ == '__main__':
    app.run(debug=True)
