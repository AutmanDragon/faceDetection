import firebase_admin
from firebase_admin import credentials, firestore, auth
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from google.cloud.firestore_v1 import FieldFilter
from typing import Optional
from fastapi.responses import JSONResponse
import requests
from fastapi.staticfiles import StaticFiles
import os
import shutil
from dotenv import load_dotenv

load_dotenv()

# --- (โค้ดส่วนบนเหมือนเดิม) ---
cred = credentials.Certificate("firebase.json")
firebase_admin.initialize_app(cred)
app = FastAPI()
db = firestore.client()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class Attendance(BaseModel):
    attendee_id: str
    timestamp: int
class LoginModel(BaseModel):
    email: str
    password: str
UPLOAD_DIR = "public_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploaded_images", StaticFiles(directory=UPLOAD_DIR), name="static")

# --- vvv จุดที่แก้ไขสำคัญที่สุด vvv ---
@app.get("/dashboard/")
async def get_dashboard_data():
    try:
        print("Fetching dashboard data with NEW 13:00-16:00 logic...")
        
        students_cache = {doc.id: doc.to_dict() for doc in db.collection("students").stream()}
        
        today_utc = datetime.now(timezone.utc).date()
        startOfToday_ts = int(datetime(today_utc.year, today_utc.month, today_utc.day, tzinfo=timezone.utc).timestamp())
        endOfToday_ts = startOfToday_ts + 86400 - 1

        attendances_today_ref = db.collection("attendances") \
            .where(filter=FieldFilter("timestamp", ">=", startOfToday_ts)) \
            .where(filter=FieldFilter("timestamp", "<=", endOfToday_ts)) \
            .stream()

        all_today_data = [doc.to_dict() for doc in attendances_today_ref]
        
        # --- LOGIC การคำนวณที่แก้ไขใหม่ทั้งหมด ---
        on_time_count = 0
        late_count = 0
        
        # --- vvv เปลี่ยนแปลงเวลาเรียนเป็น 13:00 - 16:00 (GMT+7) vvv ---
        # 13:00 GMT+7  ->  06:00 UTC
        # 13:30 GMT+7  ->  06:30 UTC
        # 16:00 GMT+7  ->  09:00 UTC
        startClassTime_utc = datetime(today_utc.year, today_utc.month, today_utc.day, 6, 0, 0, tzinfo=timezone.utc) 
        onTimeCutoff_utc = datetime(today_utc.year, today_utc.month, today_utc.day, 6, 30, 0, tzinfo=timezone.utc)
        endClassTime_utc = datetime(today_utc.year, today_utc.month, today_utc.day, 9, 0, 0, tzinfo=timezone.utc)  
        # --- ^^^ สิ้นสุดการเปลี่ยนแปลงเวลา ^^^ ---

        # กรองข้อมูลเฉพาะที่อยู่ "ในเวลาเรียน" เท่านั้น
        valid_attendances = []
        for att_data in all_today_data:
            att_time = datetime.fromtimestamp(att_data.get("timestamp", 0), tz=timezone.utc)
            # เช็คว่าเวลาเช็คชื่อ อยู่ในกรอบ 13:00 - 16:00 หรือไม่
            if startClassTime_utc <= att_time <= endClassTime_utc:
                valid_attendances.append(att_data) # เก็บไว้เพื่อนับคนขาด
                if att_time < onTimeCutoff_utc:
                    on_time_count += 1
                else:
                    late_count += 1
        
        # Logic ใหม่: คำนวณคนขาด (ถ้าไม่เช็คชื่อ = ขาด)
        # เราจะนับเฉพาะคนที่เช็คชื่อ "ในเวลาเรียน" เท่านั้น
        attended_today_ids = {att_data["attendee_id"] for att_data in valid_attendances}
        absent_count = len(students_cache) - len(attended_today_ids)
        
        attendance_counts = [
            {"status": "on_time", "count": on_time_count},
            {"status": "late", "count": late_count},
            {"status": "absent", "count": absent_count}
        ]
        attendance_data_for_chart = {
            "labels": ["ตรงเวลา", "เข้าสาย", "ขาดเรียน"],
            "datasets": [{"label": "จำนวนนักเรียน", "data": [on_time_count, late_count, absent_count], "backgroundColor": ["rgba(40, 167, 69, 0.5)", "rgba(255, 193, 7, 0.5)", "rgba(220, 53, 69, 0.5)"]}]
        }
        
        # บันทึกล่าสุดยังคงดึงจากข้อมูลทั้งหมดของวัน (รวมนอกเวลา)
        all_today_data.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        recent_attendances = []
        for att_data in all_today_data[:5]:
            attendee_id = att_data.get("attendee_id")
            if attendee_id in students_cache:
                student_info = students_cache[attendee_id]
                recent_attendances.append({
                    "attendee_id": attendee_id,
                    "first_name": student_info.get("first_name"),
                    "last_name": student_info.get("last_name"),
                    "datetime": datetime.fromtimestamp(att_data.get("timestamp", 0), tz=timezone.utc).isoformat()
                })
        
        return {
            "attendanceData": attendance_data_for_chart,
            "attendanceCounts": attendance_counts,
            "recentAttendances": recent_attendances
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# --- ^^^ สิ้นสุดจุดแก้ไข ^^^ ---

# ... (โค้ดส่วนที่เหลือทั้งหมดเหมือนเดิม) ...
@app.post("/attendances/")
async def create_attendance(attendance: Attendance):
    attendanceDict = attendance.model_dump()
    attendanceDate = datetime.fromtimestamp(attendanceDict["timestamp"], tz=timezone.utc).date()
    startOfToday = int(datetime(attendanceDate.year, attendanceDate.month, attendanceDate.day, tzinfo=timezone.utc).timestamp())
    endOfToday = int(datetime(attendanceDate.year, attendanceDate.month, attendanceDate.day, 23, 59, 59, tzinfo=timezone.utc).timestamp())
    existed_stream = (
        db.collection("attendances")
        .where(filter=FieldFilter("attendee_id", "==", attendanceDict["attendee_id"]))
        .where(filter=FieldFilter("timestamp", ">=", startOfToday))
        .where(filter=FieldFilter("timestamp", "<=", endOfToday))
        .stream()
    )
    if len(list(existed_stream)) > 0:
        raise HTTPException(status_code=400, detail="The student is already attended for today")
    db.collection("attendances").add(attendanceDict)
    return attendanceDict, status.HTTP_201_CREATED

@app.get("/attendances/details/")
async def get_all_attendances_details():
    try:
        students_cache = {doc.id: doc.to_dict() for doc in db.collection("students").stream()}
        attendances_ref = db.collection("attendances").stream()
        attendances = []
        for doc in attendances_ref:
            attendance_data = doc.to_dict()
            attendee_id = attendance_data.get("attendee_id")
            if attendee_id in students_cache:
                student_info = students_cache[attendee_id]
                attendance_data["first_name"] = student_info.get("first_name", "N/A")
                attendance_data["last_name"] = student_info.get("last_name", "")
                timestamp = attendance_data.get("timestamp", 0)
                attendance_data["datetime"] = datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
                attendances.append(attendance_data)
        attendances.sort(key=lambda x: x["timestamp"], reverse=True)
        return attendances
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attendance details: {e}")

@app.get("/students/")
async def get_all_students():
    try:
        students_ref = db.collection("students").stream()
        return [{"student_id": doc.id, **doc.to_dict()} for doc in students_ref]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/students/{student_id}")
async def delete_student(student_id: str):
    student_ref = db.collection("students").document(student_id)
    if not student_ref.get().exists:
        raise HTTPException(status_code=404, detail=f"ไม่พบข้อมูลนักเรียนรหัส {student_id}")
    try:
        auth.delete_user(student_id)
        student_ref.delete()
        return {"message": f"ลบข้อมูลนักเรียนรหัส {student_id} สำเร็จ"}
    except auth.UserNotFoundError:
        student_ref.delete()
        return {"message": f"ลบข้อมูลนักเรียนรหัส {student_id} ที่ไม่สมบูรณ์ออกจาก Firestore สำเร็จ"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดขณะลบข้อมูล: {e}")

@app.post("/register")
async def register(
    email: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    password: str = Form(...),
    image: UploadFile = File(...)
):
    if not email.endswith("@kmitl.ac.th"):
        raise HTTPException(status_code=400, detail="ต้องใช้อีเมลของ @kmitl.ac.th เท่านั้น")
    student_id = email.split('@')[0]
    if db.collection("students").document(student_id).get().exists:
        raise HTTPException(status_code=400, detail="รหัสนักศึกษานี้มีอยู่ในระบบแล้ว")
    image_url_to_save = None
    try:
        file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
        unique_filename = f"{student_id}.{file_extension}"
        file_location = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_url_to_save = f"http://localhost:8000/uploaded_images/{unique_filename}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการบันทึกรูปภาพ: {e}")
    try:
        user_record = auth.create_user(
            uid=student_id, email=email, password=password,
            display_name=f"{first_name} {last_name}", photo_url=image_url_to_save
        )
        user_data = {
            "first_name": first_name, "last_name": last_name,
            "email": email, "image_url": image_url_to_save
        }
        db.collection("students").document(student_id).set(user_data)
        return {"message": "ลงทะเบียนสำเร็จ", "uid": user_record.uid}
    except Exception as e:
        try: auth.delete_user(student_id)
        except Exception: pass
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการลงทะเบียน: {e}")

@app.post("/login")
async def login(data: LoginModel):
    REST_API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "YOUR_WEB_API_KEY_HERE")
    if "YOUR_WEB_API_KEY_HERE" in REST_API_KEY:
        raise HTTPException(status_code=500, detail="Firebase Web API Key is not configured.")
    rest_api_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={REST_API_KEY}"
    payload = {"email": data.email, "password": data.password, "returnSecureToken": True}
    try:
        response = requests.post(rest_api_url, json=payload)
        response_data = response.json()
        if "error" in response_data:
            if response_data["error"]["message"] == "INVALID_LOGIN_CREDENTIALS":
                raise HTTPException(status_code=401, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
            raise HTTPException(status_code=400, detail=response_data["error"]["message"])
        uid = response_data['localId']
        user_info_doc = db.collection("students").document(uid).get()
        user_display_name = None
        if user_info_doc.exists:
            user_data = user_info_doc.to_dict()
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            user_display_name = f"{first_name} {last_name}".strip()
        if not user_display_name:
            user_display_name = response_data.get('displayName', 'ผู้ใช้')
        is_teacher = response_data['email'] == "silar@kmitl.ac.th"
        return {"id": uid, "name": user_display_name, "email": response_data['email'], "isTeacher": is_teacher}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))