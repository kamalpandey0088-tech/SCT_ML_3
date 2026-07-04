import os
import pickle
import numpy as np
from sklearn.svm import SVC
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

def generate_mock_models():
    models_dir = "./models"
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. StandardScaler (1280 features)
    scaler = StandardScaler()
    dummy_data = np.random.randn(100, 1280)
    scaler.fit(dummy_data)
    
    # 2. PCA (reduce to 30 components)
    pca = PCA(n_components=30, random_state=42)
    scaled_data = scaler.transform(dummy_data)
    pca.fit(scaled_data)
    
    # 3. SVM (RBF SVC, trained on 30 features)
    X_pca = pca.transform(scaled_data)
    y = np.random.randint(0, 2, size=100)  # 100 cats/dogs labels
    
    svc = SVC(probability=True, random_state=42)
    svc.fit(X_pca, y)
    
    # Save artifacts
    with open(os.path.join(models_dir, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    with open(os.path.join(models_dir, "pca.pkl"), "wb") as f:
        pickle.dump(pca, f)
    with open(os.path.join(models_dir, "svm.pkl"), "wb") as f:
        pickle.dump(svc, f)
        
    print("✅ Generated mock models in ./models/")

if __name__ == "__main__":
    generate_mock_models()
