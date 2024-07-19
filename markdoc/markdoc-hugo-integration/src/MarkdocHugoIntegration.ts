import fs from 'fs';
import { PrefOptionsConfig } from './schemas/yaml/prefOptions';
import { FileParser, ParsingErrorReport } from './helperModules/FileParser';
import { FileNavigator } from './helperModules/FileNavigator';
import { ConfigProcessor } from './helperModules/ConfigProcessor';
import { HtmlBuilder } from './helperModules/HtmlBuilder';

export class MarkdocHugoIntegration {
  prefOptionsConfig: PrefOptionsConfig;
  sitewidePrefNames: string[] = [];
  markdocFiles: string[] = [];
  partialsDir: string;
  // Errors from the AST parsing process,
  // which come with some extra information, like line numbers
  parsingErrorReportsByFilePath: Record<string, ParsingErrorReport[]> = {};
  // All other errors caught during compilation
  validationErrorsByFilePath: Record<string, string> = {};

  /**
   * Ingest the available configuration files
   * and scan the content directory for Markdoc files.
   */
  constructor(p: {
    sitewidePrefsFilepath: string;
    prefOptionsConfigDir: string;
    contentDir: string;
    partialsDir: string;
  }) {
    this.prefOptionsConfig = ConfigProcessor.loadPrefOptionsFromDir(
      p.prefOptionsConfigDir
    );
    this.sitewidePrefNames = ConfigProcessor.loadSitewidePrefsConfigFromFile(
      p.sitewidePrefsFilepath
    );
    this.markdocFiles = FileNavigator.findInDir(p.contentDir, /\.mdoc$/);
    this.partialsDir = p.partialsDir;
  }

  /**
   * Compile all detected Markdoc files to HTML.
   */
  compile() {
    for (const markdocFile of this.markdocFiles) {
      const parsedFile = FileParser.parseMdocFile(markdocFile, this.partialsDir);

      // if the file has errors, log the errors for later output
      // and continue to the next file
      if (parsedFile.errorReports.length > 0) {
        this.parsingErrorReportsByFilePath[markdocFile] = parsedFile.errorReports;
        continue;
      }

      // verify that all possible placeholder values
      // yield an existing options set
      try {
        ConfigProcessor.validatePlaceholders(
          parsedFile.frontmatter,
          this.prefOptionsConfig
        );
      } catch (e) {
        if (e instanceof Error) {
          this.validationErrorsByFilePath[markdocFile] = e.message;
        } else if (typeof e === 'string') {
          this.validationErrorsByFilePath[markdocFile] = e;
        } else {
          this.validationErrorsByFilePath[markdocFile] = JSON.stringify(e);
        }
        continue;
      }

      // build the renderable tree and write the file to HTML
      try {
        const html = HtmlBuilder.build({
          parsedFile,
          prefOptionsConfig: this.prefOptionsConfig
        });
        fs.writeFileSync(markdocFile.replace(/\.mdoc$/, '.html'), html);
      } catch (e) {
        if (e instanceof Error) {
          this.validationErrorsByFilePath[markdocFile] = e.message;
        } else if (typeof e === 'string') {
          this.validationErrorsByFilePath[markdocFile] = e;
        } else {
          this.validationErrorsByFilePath[markdocFile] = JSON.stringify(e);
        }
      }
    }

    return {
      hasErrors: this.hasErrors(),
      parsingErrorReportsByFilePath: this.parsingErrorReportsByFilePath,
      validationErrorsByFilePath: this.validationErrorsByFilePath
    };
  }

  hasErrors() {
    return (
      Object.keys(this.parsingErrorReportsByFilePath).length > 0 ||
      Object.keys(this.validationErrorsByFilePath).length > 0
    );
  }

  logErrorsToConsole() {
    const errorReportsByFilePath = this.parsingErrorReportsByFilePath;
    if (Object.keys(errorReportsByFilePath).length > 0) {
      console.error(`Syntax errors found in Markdoc files:`);

      for (const filePath in errorReportsByFilePath) {
        console.error(`\nIn file ${filePath}:`);
        errorReportsByFilePath[filePath].forEach((report) => {
          console.error(
            `  - ${report.error.message} at line(s) ${report.lines.join(', ')}`
          );
        });
      }
    }

    if (Object.keys(this.validationErrorsByFilePath).length > 0) {
      console.error(`Errors found in Markdoc files:`);

      for (const filePath in this.validationErrorsByFilePath) {
        console.error(`\nIn file ${filePath}:`);
        console.error(`  - ${this.validationErrorsByFilePath[filePath]}`);
      }
    }
  }
}
