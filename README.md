# Heart Disease Prediction

## 📖 Overview
A comprehensive machine learning pipeline for predicting heart disease using various algorithms and techniques.

**Features included:**
- Data preprocessing and cleaning
- Principal Component Analysis (PCA) for dimensionality reduction
- Feature selection using multiple methods
- Supervised learning models (Logistic Regression, Decision Tree, Random Forest, SVM)
- Unsupervised learning techniques (K-Means, Hierarchical Clustering)
- Hyperparameter optimization using GridSearchCV

---
**Directory Descriptions:**
- `data/` - Dataset files (raw, cleaned, processed)
- `notebooks/` - Jupyter notebooks for analysis pipeline
- `results/` - Output files (metrics, models, clustering results)
---

## 📊 Workflow

### 1. **Data Preprocessing**
- Handle missing values using appropriate imputation strategies
- Normalize/standardize numerical features
- Encode categorical variables using one-hot or label encoding

### 2. **Dimensionality Reduction**
- Apply PCA to reduce feature space while retaining >95% of variance
- Visualize explained variance ratio

### 3. **Feature Selection**
- **Random Forest Feature Importance**: Select top features based on tree-based importance
- **Recursive Feature Elimination (RFE)**: Use Logistic Regression as estimator
- **Chi-Square Test**: Statistical test for feature-target independence

### 4. **Supervised Learning**
- **Models**: Logistic Regression, Decision Tree, Random Forest, Support Vector Machine
- **Evaluation Metrics**: Accuracy, Precision, Recall, F1-Score, ROC-AUC
- Cross-validation for robust performance estimation

### 5. **Unsupervised Learning**
- **K-Means Clustering**: Determine optimal clusters using Elbow Method and Silhouette Score
- **Hierarchical Clustering**: Create dendrograms for cluster visualization
- **Evaluation**: Adjusted Rand Index (ARI) for clustering quality assessment

### 6. **Hyperparameter Tuning**
- GridSearchCV optimization for all supervised models
- Save the best-performing model as `best_model.pkl`
- Record optimal hyperparameters and performance metrics

---

## 📈 Results

- **Best Performing Model**: Random Forest or SVM (varies by dataset characteristics)
- **Performance Metrics**: Detailed results saved in `results/evaluation_metrics.csv`
- **Clustering Analysis**: Unsupervised learning insights in `results/clustering_results.csv`
- **Trained Model**: Best model saved as `results/best_model.pkl` for deployment

---

##  Usage
## Loading and Using the Trained Model
```python
import joblib
import pandas as pd

# Load the trained model
model = joblib.load("results/best_model.pkl")

# Create sample patient data
new_patient = pd.DataFrame([{
    "age": 55,
    "chol": 250,
    "thalach": 150,
    "trestbps": 140,
    "cp": 2
}])

# Make prediction
prediction = model.predict(new_patient)
probability = model.predict_proba(new_patient)

# Display results
print("Prediction:", "Heart Disease" if prediction[0] == 1 else "No Heart Disease")
print(f"Confidence: {probability[0].max():.2f}")