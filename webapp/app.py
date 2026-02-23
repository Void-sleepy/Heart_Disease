import os
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, jsonify
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

app = Flask(__name__)

# ── Load & train model on startup ─────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "heart-disease-UCI.csv")

df = pd.read_csv(DATA_PATH)

FEATURES = ["age", "sex", "cp", "trestbps", "chol",
            "fbs", "restecg", "thalach", "exang",
            "oldpeak", "slope", "ca", "thal"]

X = df[FEATURES].copy()
y = df["target"].apply(lambda v: 1 if v > 0 else 0)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

train_acc = model.score(X_train, y_train)
test_acc  = model.score(X_test,  y_test)
print(f"[Model] Train accuracy: {train_acc:.3f} | Test accuracy: {test_acc:.3f}")


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)

        # Map human-readable select values to numbers
        sex_map   = {"male": 1, "female": 0}
        cp_map    = {"typical_angina": 0, "atypical_angina": 1,
                     "non_anginal": 2, "asymptomatic": 3}
        fbs_map   = {"yes": 1, "no": 0}
        restecg_map = {"normal": 0, "st_t": 1, "lvh": 2}
        exang_map = {"yes": 1, "no": 0}
        slope_map = {"upsloping": 0, "flat": 1, "downsloping": 2}
        thal_map  = {"normal": 1, "fixed": 2, "reversable": 3}

        row = [
            float(data["age"]),
            sex_map[data["sex"]],
            cp_map[data["cp"]],
            float(data["trestbps"]),
            float(data["chol"]),
            fbs_map[data["fbs"]],
            restecg_map[data["restecg"]],
            float(data["thalach"]),
            exang_map[data["exang"]],
            float(data["oldpeak"]),
            slope_map[data["slope"]],
            int(data["ca"]),
            thal_map[data["thal"]],
        ]

        row_scaled = scaler.transform([row])
        prob       = model.predict_proba(row_scaled)[0][1]   # probability of disease
        pred       = int(prob >= 0.5)

        # Risk tier
        if prob < 0.35:
            risk = "low"
        elif prob < 0.65:
            risk = "moderate"
        else:
            risk = "high"

        return jsonify({
            "prediction": pred,
            "probability": round(float(prob) * 100, 1),
            "risk": risk
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5000)
