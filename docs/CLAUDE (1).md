# CLAUDE.md — Quy Tắc Xây Dựng & Kiểm Tra Tài Liệu Phần Mềm

## Triết lý cốt lõi

Tài liệu phần mềm không chỉ là văn bản mô tả — nó là **hợp đồng logic** giữa business, developer, và QA. Mọi tài liệu phải có thể trace ngược về yêu cầu nghiệp vụ gốc và trace xuôi đến implementation cụ thể.

---

## 1. QUY TẮC VIẾT TÀI LIỆU

### 1.1. Cấu trúc bắt buộc cho mọi tài liệu

Mỗi tài liệu PHẢI có:
- **Metadata header**: version, author, reviewers, status, last_updated
- **Changelog**: mọi thay đổi phải ghi lại ai thay đổi, khi nào, tại sao
- **Glossary**: định nghĩa rõ ràng mọi thuật ngữ nghiệp vụ, KHÔNG giả định người đọc hiểu
- **Traceability matrix**: mỗi requirement phải map được đến use case, test case, và acceptance criteria

### 1.2. Quy tắc ngôn ngữ

- KHÔNG dùng từ mơ hồ: "nhanh", "hợp lý", "phù hợp", "đủ lớn" → phải có con số cụ thể
- KHÔNG dùng passive voice cho action items: "hệ thống sẽ được cập nhật" → "Service X gọi API Y để cập nhật field Z"
- Mỗi business rule PHẢI có format: `WHEN [điều kiện] THEN [hành động] ELSE [hành động thay thế]`
- Mỗi API endpoint PHẢI document: method, path, request/response schema, error codes, rate limit

### 1.3. Quy tắc logic nghiệp vụ

- Mọi workflow PHẢI có state diagram hoặc flowchart
- Mọi trạng thái (state) PHẢI define rõ: ai trigger chuyển trạng thái, điều kiện chuyển, side effects
- KHÔNG được có "dead state" — mọi trạng thái phải có ít nhất 1 transition ra
- Mọi quyết định rẽ nhánh (decision) PHẢI cover cả happy path VÀ tất cả error/edge cases
- Race conditions PHẢI được identify và document cách xử lý

### 1.4. Quy tắc về data

- Mọi entity PHẢI có data dictionary: field name, type, constraints, nullable, default, business meaning
- Mọi relationship giữa entities PHẢI specify cardinality (1:1, 1:N, M:N) và cascade behavior
- PHẢI document data lifecycle: creation → update rules → archival → deletion policy
- PHẢI specify data validation rules tại TỪNG điểm nhập liệu

---

## 2. QUY TẮC REVIEW TÀI LIỆU

### 2.1. Review pipeline bắt buộc

Mọi tài liệu PHẢI qua 4 vòng review theo thứ tự. KHÔNG được skip bất kỳ vòng nào:

1. **Structure + Cross-Reference Review** → dùng `@agent-doc-structure-reviewer` (kiểm tra metadata, ToC, glossary, traceability, orphan references, dangling links)
2. **Anti-AI Writing Style Review** → dùng `@agent-doc-anti-ai-reviewer` (phát hiện AI-tells, padding, forced rule-of-three, banned phrases)
3. **Logic + Business Rule Review** → dùng `@agent-doc-logic-reviewer` (consistency, contradictions, missing edge cases, business rule acceptance criteria)
4. **Reader Comprehension Test** → dùng `@agent-doc-reader-tester`

Vòng 1 đã merge `doc-cross-ref-reviewer` cũ; vòng 3 đã merge `doc-business-reviewer` cũ — đây là quyết định thực tế sau khi chạy pipeline phát hiện overlap đáng kể.

### 2.2. Tiêu chí Pass/Fail

- Structure + Cross-ref: score >= 80/100, 0 orphan requirements, 0 dangling references → Pass
- Anti-AI: AI score >= 70 (HUMAN-LIKE), <= 5 AI-tells nghiêm trọng → Pass
- Logic + Business: 0 critical issues, <= 3 major issues, tất cả business rules có acceptance criteria → Pass
- Reader test: fresh agent trả lời đúng >= 90% câu hỏi (HIGH confidence < 20%) → Pass

### 2.3. Quy trình xử lý issue

- CRITICAL: block release, phải fix ngay, cần re-review toàn bộ section
- MAJOR: phải fix trước deadline, re-review section bị ảnh hưởng
- MINOR: fix trong sprint tiếp theo, không cần re-review
- SUGGESTION: backlog, review khi refactor

---

## 3. QUY TẮC SỬ DỤNG SUB-AGENTS

### 3.1. Khi nào dùng sub-agent

- Viết tài liệu mới: dùng `/doc-create` slash command → tự động orchestrate pipeline
- Review tài liệu có sẵn: dùng `/doc-review` slash command → chạy 4 vòng review + executive summary
- Phát hiện lỗi logic: `@agent-doc-logic-reviewer` chạy riêng cho section cụ thể
- Cross-check tài liệu vs codebase: `@agent-doc-structure-reviewer` (cross-ref đã merge vào structural agent)

### 3.2. Nguyên tắc sub-agent

- Mỗi sub-agent chạy trong context riêng biệt — không chia sẻ context với main thread
- Sub-agents có thể chạy parallel cho các review độc lập (structural + logic chạy cùng lúc)
- Kết quả review PHẢI aggregate lại trong main thread trước khi đưa ra kết luận
- Nếu sub-agent phát hiện issue CRITICAL: dừng pipeline, escalate lên main thread ngay

---

## 4. DANH SÁCH ANTI-PATTERNS PHẢI PHÁT HIỆN

### 4.1. Logic errors thường gặp

- **Missing else**: if-then không có else → hỏi "chuyện gì xảy ra nếu điều kiện FALSE?"
- **Circular dependency**: A depends on B, B depends on A
- **Implicit assumption**: "user đã đăng nhập" — ai verify? session expire thì sao?
- **Time paradox**: step 3 cần output của step 5
- **Phantom state**: trạng thái được mention nhưng không define transition
- **Dead end**: workflow path không có kết thúc rõ ràng
- **Race condition**: 2 users cùng approve 1 document → ai thắng?
- **Boundary blindness**: "số lượng > 0" — negative numbers? zero? MAX_INT?

### 4.2. Business logic errors thường gặp

- **Contradicting rules**: Rule A nói discount 10%, Rule B nói discount 15% cho cùng điều kiện
- **Missing stakeholder**: workflow approve nhưng thiếu role có quyền approve
- **Regulatory gap**: xử lý data nhưng không mention compliance (GDPR, PCI-DSS, etc.)
- **Currency/timezone blindness**: tính toán tiền hoặc thời gian không specify timezone/currency
- **Rounding error**: tính phần trăm nhưng không specify rounding rule
- **Off-by-one in business terms**: "trong vòng 3 ngày" — business days hay calendar days? Inclusive hay exclusive?

### 4.3. Documentation errors thường gặp

- **Copy-paste ghost**: section copy từ doc khác, vẫn còn reference sai context
- **Version drift**: tài liệu refer version cũ của API/schema
- **Diagram-text mismatch**: flowchart nói khác với text mô tả
- **Undefined acronym**: dùng viết tắt mà không define lần đầu
- **Dangling reference**: "xem Section 3.2" nhưng section 3.2 không tồn tại

---

## 5. TEMPLATE VÀ CHECKLIST

### 5.1. Trước khi viết (Pre-writing checklist)

- [ ] Đã xác định rõ audience (developer? BA? QA? stakeholder?)
- [ ] Đã thu thập đủ input (requirements, meeting notes, existing docs)
- [ ] Đã chọn đúng template cho loại tài liệu
- [ ] Đã setup traceability IDs (REQ-001, UC-001, TC-001)

### 5.2. Trước khi submit review (Self-review checklist)

- [ ] Mọi business rule đều có format WHEN-THEN-ELSE
- [ ] Mọi workflow đều có diagram
- [ ] Không có từ mơ hồ (search: "appropriate", "adequate", "reasonable", "sufficient")
- [ ] Mọi external reference đều có link/version
- [ ] Glossary đầy đủ
- [ ] Changelog cập nhật

### 5.3. Sau khi review (Post-review checklist)

- [ ] Tất cả CRITICAL issues đã fix
- [ ] Tất cả MAJOR issues đã fix hoặc có plan
- [ ] Re-review sections bị thay đổi
- [ ] Version number đã bump
- [ ] Reviewers đã sign-off