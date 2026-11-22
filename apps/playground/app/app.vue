<template>
  <NuxtPage />
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #fafafa;
  color: #1a1a1a;
}
main {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 16px;
}
button {
  padding: 10px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}
button + button {
  margin-left: 8px;
}
dt {
  font-weight: 600;
  margin-top: 8px;
}
dd {
  margin: 0;
}
.muted {
  color: #777;
}
.card {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e3e3e3;
  border-radius: 8px;
  background: #fff;
}
.card h2 {
  margin-top: 0;
  font-size: 16px;
}
button.primary {
  border-color: #1a73e8;
  background: #1a73e8;
  color: #fff;
}
button.link {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-decoration: underline;
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
.error {
  padding: 8px 12px;
  border-radius: 6px;
  background: #fdecea;
  color: #b3261e;
}
ul {
  padding-left: 18px;
  font-size: 13px;
}
</style>
