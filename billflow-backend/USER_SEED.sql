-- Default BillFlow users with bcrypt-hashed passwords
-- admin / admin123
-- commercial / commercial123
INSERT INTO users (id, username, password_hash, name, role)
VALUES
  (1, 'admin', '$2a$10$90JTBuAUYc3l1ORhxgl4L.KnWd8fiidMoM.dwbp1NsdhzZaZUVGxG', 'Administrateur', 'admin'),
  (2, 'commercial', '$2a$10$CtLN9HK1M8G/6v0/iIm4uOEulJow0tPzm0XS9mwJSvOw7rlbC0ozG', 'Commercial', 'commercial')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  name = VALUES(name),
  role = VALUES(role);
