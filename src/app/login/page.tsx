'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { login } from '../contexts/store/auth_slice'
import axios, { isAxiosError } from 'axios'
import Link from 'next/link'

import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup, Spinner } from 'react-bootstrap'
import { BoxArrowInRight, EnvelopeFill, LockFill } from 'react-bootstrap-icons'

// 'useSelector' ไม่ได้ถูกใช้แล้วในหน้านี้
// import { useSelector } from 'react-redux'
// import { RootState } from '../contexts/store'
// 'ThemeEnum' ไม่ได้ถูกใช้แล้วในหน้านี้
// import { ThemeEnum } from '@/interfaces/enums'

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useDispatch()
  // ลบตัวแปร theme ที่ไม่ได้ใช้งานออก
  // const theme = useSelector((state: RootState) => state.theme.mode)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await axios.post('http://localhost:8000/login', {
        email: formData.email,
        password: formData.password
      })

      if (response.status === 200) {
        // ยืนยันว่าข้อมูลถูกส่งไปในรูปแบบที่ถูกต้องตาม auth_slice
        dispatch(login({
          user: {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            isTeacher: response.data.isTeacher
          },
          token: 'fake-jwt-token'
        }))
        router.push('/')
      }
    } catch (err) {
        console.error(err);
        if (isAxiosError(err)) {
            const errorMessage = err.response?.data?.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            setError(errorMessage);
        } else {
            setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        }
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={4}>
          {/* Bootstrap จะจัดการธีมของ Card ให้เองผ่าน data-bs-theme ใน layout.tsx */}
          <Card className="shadow-lg border-0">
            <Card.Body className="p-4 p-sm-5">
              <div className="text-center mb-4">
                <BoxArrowInRight size={40} className="mb-2" />
                <h2 className="fw-bold">เข้าสู่ระบบ</h2>
                <p className="text-muted">ยินดีต้อนรับกลับ!</p>
              </div>
              
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>อีเมล</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><EnvelopeFill /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@kmitl.ac.th"
                      required
                      disabled={isLoading}
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>รหัสผ่าน</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><LockFill /></InputGroup.Text>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="กรอกรหัสผ่าน"
                      required
                      disabled={isLoading}
                    />
                  </InputGroup>
                </Form.Group>

                <Button 
                  variant="primary"
                  type="submit" 
                  className="w-100"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">กำลังตรวจสอบ...</span>
                    </>
                  ) : (
                    'เข้าสู่ระบบ'
                  )}
                </Button>
              </Form>

              <div className="text-center mt-4">
                <span className="text-muted">ยังไม่มีบัญชีใช่ไหม? </span>
                <Link href="/register">สมัครสมาชิก</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

