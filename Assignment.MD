### Senior Node/React Engineering Assignment

#### AI-Directed Build Exercise (2–3 Hours)

---

### Overview

In this exercise, you will build a small web-based bookstore application using an AI coding agent of your choice (Claude, Codex etc.).  In addition to sharing the code itself, we also ask that you include your full chatlog with the AI so we can evaluate how you interact with it.  In other words, this assignment will evaluate your ability to lead and constrain an AI coding agent, to exercise engineering judgement under ambiguity, and to then modify AI output to reach a final product that is representative of your overall skills as a developer.

You should spend no more than 3 hours on this exercise.

You are not expected to build a production-ready system. We care more about thinking and structure than completeness.  Since this is an AI-assisted effort, the scope is very large for a 3 hour project, and intentionally way more work than you would be expected to complete on your own.  If you would like to choose to reduce the scope or even eliminate requirements, that's OK if you feel it would improve the overall quality of your submission.  You just need to acknowledge that in the README file you submit and justify your decision.    

---

#### Required Process (Important)

This assignment evaluates how you manage AI, not just what you build.

You must:

#### 1. Start With a Plan (Before Writing Code)

Before generating implementation code, ask your AI agent to propose: A high-level implementation plan, a Prisma schema, a GraphQL schema.

Include this in your chat log.  You may refine or simplify the plan.

#### 2. Constrain the AI At Least Once

At least once during the process, explicitly constrain your AI agent.  We want to see how you guide AI toward pragmatic output.

#### 3. Improve or Correct AI-Generated Code

At least once, you must identify something the AI generated that was suboptimal, incorrect, or overly complex.  Then improve or simplify it.  Include a section in your README explaining what the AI initially suggested, why you changed it, and what you did.  

---

### The Product

Build a minimal web-based bookstore application.  It will contain a catalog of books which users can browse, add to a cart, and checkout.  Some other basic features like search, 1-5 star reviews, and reporting are also in scope.  

### Technical Requirements

Tech Stack:  Node.js, React, Vite, GraphQL (Apollo), Vitest, Prisma ORM, Postgres

### Data Requirements

Assume data will be pre-seeded.  You don’t need to explicitly generate data as part of your submission, but if you create any scripts to pre-seed testing data feel free to include it.  

Your system should reasonably support: ~10,000 books, ~10,000 authors, ~100 publishers, and ~1,000 users.  You are not required to generate that much data, just make sure it supports it.

#### Data Modeling Requirements

You must plan the following data models to support a basic bookstore application.  Some aspects are intentionally underspecified. It’s OK to use your own judgement along the way to fill in the gaps.  You may also choose to omit specific fields within a given model as long as you justify that decision in your README file.  

### Books

Each book should include: Title, Price (single price per book; all formats share same price, and don’t worry about currency), Publisher, One or more authors, One or more genres, Multiple formats: (Hardcover, Softcover, Audiobook, E-reader)  
  
One specific request to document within this:  how you are modeling the formats (separate model or something else)

### Authors

The only relevant field is their name, but note that it's a many-to-many relationship with books.  
  

### Publishers

Name is only the only required field.  Each book has one publisher.  

### Genres (or call it Category)

Name is the only required field.  No subgenres or hierarchy is required; it can be flat. Many-to-many relationship with books.

### Users

Name is the only required field.  No authentication: within the application context, the “current user” is just selected via dropdown of all available users.  The dataset should support approximately 1,000 users, so consider basic usability implications of the dropdown itself.

### Reviews

One review per user per book. Rating: 1–5 stars.  Reviews are: Format-agnostic and immutable (no editing or deleting).  The aggregates on the frontend are displayed as a mean with one decimal and the total number of reviews e.g. 4.5 stars out of 500 reviews.  

The system must: Prevent multiple reviews per user per book.  Display average rating and review count.  It’s up to you to decide how reviews are aggregated by book.  

### Orders

Users can add books to a cart. “Checkout” creates a completed order but no payment is required. Orders contain: Book (with chosen format) and quantity.  Ensure the current price is memoized with the order so if the price changes in the future, we have a record of what was actually paid.   
  

---

### Other Feature Requirements

#### Pagination

The book catalog must support pagination. You must decide on offset vs cursor-based and explain why you chose it. The UI must expose paging controls.

#### Unified Search

Provide a single search input that matches fragments of Book title OR Author name.  The search must work with pagination and return book results.

You must decide: How search is implemented, any indexing decisions, any performance considerations

---

### Required User Flows

Your application must support:

#### Browse Books

- Paginated catalog view
    
- Filter by genre
    
- Search by title or author
    

#### Book Detail Card

Since we have limited fields to display about the books, you don’t need a separate book detail page and can choose to include all relevant book details with a “card” format within the browse view.  This card needs to include controls to review the book and add a quantity/format to their cart 

#### Reviews

As a selected user, Submit a 1–5 star review (if not already reviewed).  Not review text is required, just the star rating.  
  

#### Cart & Checkout

Required functionality: Add books from the book cards, remove them, update quantity, checkout creates an order and clears the card.  The same user can submit multiple orders.   
  

#### Reporting

Include very basic reporting:  A simple order history view, and a report showing total books purchased overall, and broken out by genre.  Keep this simple.

---

#### Additional Feature Requirement

Choose two additional features that:

- Improve user experience, OR  
      
    
- Improve data integrity, OR  
      
    
- Improve system scalability
    

In your README, include a section explaining Why you chose them and why they were valuable in this timebox.

#### Testing Requirements

Include: At least one backend test and at least one frontend test. Tests must run via Vitest  
Tests do not need to be comprehensive.

---

### Submission Deliverables

1. Create a github repo of the entire application codebase.  It can either be a public repo, or a private repo shared with [https://github.com/ryangarver](https://github.com/ryangarver)
    
2. The repo should include a README.md file and a CHATLOG.md in its root directory.
    
3. Your README must include:
    

4. Setup Instructions
    
5. Architectural Decisions
    
6. AI Output I Intentionally Changed
    
7. Two Additional Features I Chose
    
8. Assumptions & Tradeoffs Due to Timebox
    
9. Reflection: AI Usage.  Topics:  
    What did AI significantly accelerate?  
    Where did AI make things worse?  
    What risks does AI introduce into engineering workflows?
    

10. Your CHATLOG must include a full transcript of your prompts to the AI agent.  

Please don’t edit it.  It’s OK to make mistakes or have to get it out of the weeds.  That’s part of the process and we want to see how you handle it.  Also, please don’t have an AI generate the transcript itself, that’s against the spirit of this evaluation but we recognize its possible.  

When it’s complete, please email the person that gave you this assignment and CC Ryan Garver [ryan@cookiefinance.co](mailto:ryan@cookiefinance.co) (if it wasn’t Ryan that gave it to you).  Feel free to reach out to Ryan with any questions or clarifications.  We look forward to reviewing your submission and we appreciate the time you spend on this.