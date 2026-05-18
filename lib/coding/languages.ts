export const CODING_LANGUAGES = [
  {
    id: 'python',
    label: 'Python',
    monaco: 'python',
    piston: { language: 'python', version: '3.10.0' },
    fileName: 'main.py',
    stub: `# Write your solution
n = int(input())
print(n * 2)`,
  },
  {
    id: 'java',
    label: 'Java',
    monaco: 'java',
    piston: { language: 'java', version: '15.0.2' },
    fileName: 'Main.java',
    stub: `import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();
    System.out.println(n * 2);
    sc.close();
  }
}`,
  },
  {
    id: 'c',
    label: 'C',
    monaco: 'c',
    piston: { language: 'c', version: '10.2.0' },
    fileName: 'main.c',
    stub: `#include <stdio.h>

int main() {
  int n;
  scanf("%d", &n);
  printf("%d\\n", n * 2);
  return 0;
}`,
  },
  {
    id: 'cpp',
    label: 'C++',
    monaco: 'cpp',
    piston: { language: 'cpp', version: '10.2.0' },
    fileName: 'main.cpp',
    stub: `#include <iostream>
using namespace std;

int main() {
  int n;
  cin >> n;
  cout << n * 2 << endl;
  return 0;
}`,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monaco: 'javascript',
    piston: { language: 'javascript', version: '18.15.0' },
    fileName: 'main.js',
    stub: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
const n = parseInt(input, 10);
console.log(n * 2);`,
  },
  {
    id: 'go',
    label: 'Go',
    monaco: 'go',
    piston: { language: 'go', version: '1.16.2' },
    fileName: 'main.go',
    stub: `package main

import "fmt"

func main() {
  var n int
  fmt.Scan(&n)
  fmt.Println(n * 2)
}`,
  },
  {
    id: 'csharp',
    label: 'C#',
    monaco: 'csharp',
    piston: { language: 'csharp', version: '6.12.0' },
    fileName: 'Main.cs',
    stub: `using System;

class Program {
  static void Main() {
    int n = int.Parse(Console.ReadLine()!);
    Console.WriteLine(n * 2);
  }
}`,
  },
] as const;

export type CodingLanguageId = (typeof CODING_LANGUAGES)[number]['id'];

export const CODING_LANGUAGE_IDS: CodingLanguageId[] = CODING_LANGUAGES.map((l) => l.id);

export function isCodingLanguageId(value: string): value is CodingLanguageId {
  return (CODING_LANGUAGE_IDS as string[]).includes(value);
}

export function getCodingLanguage(id: string) {
  return CODING_LANGUAGES.find((l) => l.id === id) ?? CODING_LANGUAGES[0];
}
