"use client";

import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button, Col, Container, Row, Card, Badge, Spinner, Alert } from "react-bootstrap";
import { useSelector } from "react-redux";
import { RootState } from "./contexts/store"; // แก้ไข Path ถ้าจำเป็น
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataset
} from "chart.js";
import { ThemeEnum } from "@/interfaces/enums.ts"; // แก้ไข Path ถ้าจำเป็น
import { useEffect, useState } from "react";
import axios from "axios";

// --- Interfaces ---
interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
}
interface AttendanceCount {
  status: string;
  count: number;
}
interface ChartData {
  labels: string[];
  datasets: ChartDataset<'bar', number[]>[];
}
interface RecentAttendance {
    attendee_id: string;
    datetime: string;
    first_name?: string;
    last_name?: string;
}

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
);

// ====================================================================
// COMPONENT หลัก: Summary (Dashboard)
// ====================================================================
export default function Summary() {
  const theme = useSelector((state: RootState) => state.theme.mode);
  
  const [dashboardData, setDashboardData] = useState<{
    attendanceData: ChartData;
    attendanceCounts: AttendanceCount[];
    recentAttendances: RecentAttendance[];
  } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Logic การเปลี่ยนสีพื้นหลังหลัก
    if (theme === ThemeEnum.DARK) {
      document.body.style.backgroundColor = "#212529";
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.body.style.backgroundColor = "#f8f9fa";
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardResponse, studentsResponse] = await Promise.all([
          axios.get("http://localhost:8000/dashboard/"),
          axios.get("http://localhost:8000/students/"),
        ]);
        setDashboardData(dashboardResponse.data);
        setStudents(studentsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("ไม่สามารถโหลดข้อมูล Dashboard ได้");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartTextColor = theme === ThemeEnum.DARK ? "white" : "black";
  ChartJS.defaults.color = chartTextColor;

  if (loading) {
    return <div className="text-center mt-5 vh-100"><Spinner animation="border" /></div>;
  }

  if (error || !dashboardData) {
    return <div className="text-center mt-5 vh-100"><Alert variant="danger">{error || 'ไม่พบข้อมูล Dashboard'}</Alert></div>;
  }

  return (
    <Container fluid="lg" className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="fw-bold">ภาพรวมการเข้าเรียน</h2>
          <p className="text-muted">
            {new Date().toLocaleDateString("th-TH", { dateStyle: 'full' })}
          </p>
        </Col>
      </Row>
      <Row className="mb-4">
        <AttendanceCountSummary countData={dashboardData.attendanceCounts} themeMode={theme} />
      </Row>
      <Row className="mb-4">
        <DailyChartSummary chartData={dashboardData.attendanceData} themeMode={theme} />
        <AttendanceLogSummary attendees={dashboardData.recentAttendances} themeMode={theme} />
      </Row>
      <Row>
        <AttendeeListSummary attendees={students} themeMode={theme} />
      </Row>
    </Container>
  );
}

// ====================================================================
// Sub-components
// ====================================================================
interface AttendanceCountsProps { countData: AttendanceCount[]; themeMode: ThemeEnum; }
function AttendanceCountSummary({ countData, themeMode }: AttendanceCountsProps) {
    const cardProps = { className: 'h-100 shadow-sm' };
    const onTime = countData.find(d => d.status === 'on_time')?.count || 0;
    const late = countData.find(d => d.status === 'late')?.count || 0;
    const absent = countData.find(d => d.status === 'absent')?.count || 0;
    const summaryItems = [
      { title: "✅ เข้าตรงเวลา", count: onTime, color: "text-success" }, { title: "⚠️ เข้าสาย", count: late, color: "text-warning" }, { title: "❌ ขาดเรียน", count: absent, color: "text-danger" },
    ];
    return (
      <>
        {summaryItems.map((item, index) => (
          <Col md={4} key={index} className="mb-3 mb-md-0">
            <Card {...cardProps}>
              <Card.Body className="d-flex flex-column justify-content-center text-center">
                <Card.Title className="fs-5">{item.title}</Card.Title>
                <p className={`fs-1 fw-bold mb-0 ${item.color}`}>{item.count}</p>
                <Card.Text>คน</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </>
    );
}

interface DailyChartProps { chartData: ChartData; themeMode: ThemeEnum; }
function DailyChartSummary({ chartData, themeMode }: DailyChartProps) {
  const cardProps = { className: 'h-100 shadow-sm' };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: "สรุปผลการเข้าเรียนวันนี้", font: { size: 18 } } }, scales: { x: {}, y: { beginAtZero: true, ticks: { stepSize: 1 } } } };
  return ( <Col md={8} className="mb-4 mb-md-0"> <Card {...cardProps}> <Card.Body style={{ height: '400px' }}> <Bar options={options} data={chartData} /> </Card.Body> </Card> </Col> );
}

interface AttendanceLogProps { attendees: RecentAttendance[]; themeMode: ThemeEnum; }
function AttendanceLogSummary({ attendees, themeMode }: AttendanceLogProps) {
    const cardProps = { className: 'h-100 shadow-sm' };
    
    // --- vvv จุดที่แก้ไขสำคัญที่สุด vvv ---
    // นำ Logic ใหม่ที่ถูกต้องมาใช้ที่นี่ (13:00 - 16:00)
    const getStatus = (datetime: string) => {
        const attendanceTime = new Date(datetime); // นี่คือเวลา UTC จาก Server
        const datePart = attendanceTime.toISOString().split('T')[0];
        
        // เวลา UTC ที่ตรงกับ 13:00 - 16:00 (GMT+7)
        // 13:00 GMT+7  ->  06:00 UTC
        // 13:30 GMT+7  ->  06:30 UTC
        // 16:00 GMT+7  ->  09:00 UTC
        const startClassTimeUTC = new Date(`${datePart}T06:00:00Z`).getTime();
        const onTimeCutoffUTC = new Date(`${datePart}T06:30:00Z`).getTime();
        const endClassTimeUTC = new Date(`${datePart}T09:00:00Z`).getTime();

        const timeValue = attendanceTime.getTime();

        if (timeValue >= startClassTimeUTC && timeValue < onTimeCutoffUTC) {
            return <Badge bg="success">ตรงเวลา</Badge>;
        }
        if (timeValue >= onTimeCutoffUTC && timeValue <= endClassTimeUTC) {
            return <Badge bg="warning">เข้าสาย</Badge>;
        }
        return <Badge bg="secondary">นอกเวลา</Badge>;
    };
    // --- ^^^ สิ้นสุดจุดแก้ไข ^^^ ---
  
    return (
        <Col md={4}>
            <Card {...cardProps}>
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Card.Title className="mb-0">บันทึกล่าสุด</Card.Title>
                        <Link href="/attendance-logs" passHref legacyBehavior>
                           <Button as="a" variant={themeMode === ThemeEnum.DARK ? 'outline-light' : 'primary'} size="sm">ดูทั้งหมด</Button>
                        </Link>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-borderless">
                            <tbody>
                                {attendees.map((att, index) => (
                                    <tr key={index}>
                                        <td>{att.first_name}</td>
                                        <td>{getStatus(att.datetime)}</td>
                                        <td className={`text-end ${themeMode === ThemeEnum.DARK ? 'text-white-50' : 'text-muted'}`}>
                                            {new Date(att.datetime).toLocaleTimeString('th-TH', { 
                                                hour: '2-digit', 
                                                minute: '2-digit',
                                                timeZone: 'Asia/Bangkok'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );
}


interface AttendeeListProps { attendees: Student[]; themeMode: ThemeEnum; }
function AttendeeListSummary({ attendees, themeMode }: AttendeeListProps) {
    const cardProps = { className: 'shadow-sm' };
    return (
        <Col md={12}>
            <Card {...cardProps}>
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Card.Title className="mb-0">รายชื่อนักศึกษา</Card.Title>
                        <Link href="/student-list" passHref legacyBehavior>
                            <Button as="a" variant={themeMode === ThemeEnum.DARK ? 'outline-light' : 'outline-primary'} size="sm">จัดการรายชื่อ</Button>
                        </Link>
                    </div>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr><th>รหัสนักศึกษา</th><th>ชื่อ-นามสกุล</th></tr>
                            </thead>
                            <tbody>
                                {attendees.slice(0, 5).map((student, index) => (
                                    <tr key={index}><td>{student.student_id}</td><td>{student.first_name} {student.last_name}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );
}