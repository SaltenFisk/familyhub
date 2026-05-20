-- FamilyHub Database Schema

CREATE DATABASE IF NOT EXISTS familyhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE familyhub;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'child') NOT NULL DEFAULT 'child',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE  -- Thomas, Matthew, Household
);

INSERT INTO categories (name) VALUES ('Thomas'), ('Matthew'), ('Household');

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  default_assignee_id INT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(512) NOT NULL UNIQUE,  -- IMAP Message-ID to prevent duplicates
  received_at TIMESTAMP NOT NULL,
  from_address VARCHAR(512) NOT NULL,
  from_name VARCHAR(255),
  subject VARCHAR(1000),
  body_text LONGTEXT,
  body_html LONGTEXT,
  raw_headers TEXT,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_id INT NOT NULL,
  summary TEXT NOT NULL,
  action TEXT,
  due_date DATE NULL,
  is_fyi_only BOOLEAN NOT NULL DEFAULT FALSE,
  assignee_id INT NULL,
  status ENUM('pending', 'in_progress', 'done') NOT NULL DEFAULT 'pending',
  outcome TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE task_categories (
  task_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (task_id, category_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE task_tags (
  task_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
